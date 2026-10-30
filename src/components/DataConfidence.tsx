import { QUALITY_START } from "@/core";
import type { Assessment, QualityFactor } from "@/core";
import { fmt as f, type Dict, type Locale } from "@/i18n";
import { qualityGapCopy, qualityPanelCopy } from "@/i18n/quality";

const LEVEL = {
  LOW: { chip: "bg-red-100 text-red-900", bar: "bg-red-500" },
  MEDIUM: { chip: "bg-amber-100 text-amber-900", bar: "bg-amber-500" },
  HIGH: { chip: "bg-brandsoft text-brandink", bar: "bg-good" },
} as const;
const MEDIUM_FROM = 50, HIGH_FROM = 85;

/**
 * Explains the data-quality score instead of showing a bare number: what the customer can still add
 * (with the points each item is worth), and which limits come from our data or the screening scope.
 */
export function DataConfidence({ a, d, locale, currency }: { a: Assessment; d: Pick<Dict, "calc" | "labels">; locale: Locale; currency: string }) {
  const factors = a.confidence.factors;
  if (!factors) return null;
  const C = qualityPanelCopy(locale);
  const gaps = qualityGapCopy(locale, d, currency);
  const byPoints = (x: QualityFactor, y: QualityFactor) => y.points - x.points;
  const client = factors.filter((x) => x.owner === "client").sort(byPoints);
  const model = factors.filter((x) => x.owner === "model").sort(byPoints);
  const { score, level } = a.confidence;
  const reach = Math.min(QUALITY_START, score + client.reduce((s, x) => s + x.points, 0));
  const L = d.labels.confidence;
  const S = LEVEL[level];
  const label = (x: QualityFactor) => (x.gap ? <span>{gaps[x.gap]}</span> : <span lang={a.lang}>{x.text}</span>);

  return (
    <section id="data-confidence" className="card mt-4 scroll-mt-24 p-5 md:p-6" aria-labelledby="dq-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="dq-h" className="text-lg font-bold">{C.title}</h3>
        <span className={`chip num ${S.chip}`}>{L[level]} · {score}/100</span>
      </div>

      <div className="mt-4">
        <div
          role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}
          aria-valuetext={`${L[level]}, ${score}/100`} aria-labelledby="dq-h"
          className="relative h-3 overflow-hidden rounded-full bg-surface2"
        >
          {reach > score && <div className={`absolute inset-y-0 left-0 opacity-25 ${S.bar}`} style={{ width: `${reach}%` }} />}
          <div className={`absolute inset-y-0 left-0 rounded-full ${S.bar}`} style={{ width: `${score}%` }} />
          <div aria-hidden className="absolute inset-y-0 w-px bg-ink/30" style={{ left: `${MEDIUM_FROM}%` }} />
          <div aria-hidden className="absolute inset-y-0 w-px bg-ink/30" style={{ left: `${HIGH_FROM}%` }} />
        </div>
        <div aria-hidden className="relative mt-1 h-4 text-[11px] text-muted">
          <span className="absolute left-0">{L.LOW}</span>
          <span className="absolute" style={{ left: `${MEDIUM_FROM}%` }}>{L.MEDIUM}</span>
          <span className="absolute right-0">{L.HIGH}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink2">{f(C.lead, { score })}</p>

      <div className={`mt-5 grid gap-5 ${model.length ? "md:grid-cols-2" : "md:max-w-2xl"}`}>
        <div>
          <h4 className="text-sm font-semibold">{C.client}</h4>
          {client.length === 0 ? (
            <p className="mt-2 text-sm text-ink2">{C.done}</p>
          ) : (
            <>
              <ul className="mt-2 space-y-2">
                {client.map((x, i) => (
                  <li key={x.id} className={`flex items-start justify-between gap-3 rounded-lg border p-2.5 text-sm ${i === 0 ? "border-amber-300 bg-amber-50 text-amber-950" : "border-line"}`}>
                    <span className="min-w-0">
                      {i === 0 && <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide opacity-80">{C.biggest}</span>}
                      {label(x)}
                    </span>
                    <span className="num shrink-0 font-semibold text-good">+{x.points}</span>
                  </li>
                ))}
              </ul>
              <p className="num mt-2 text-sm font-semibold">{f(C.reach, { n: reach })}</p>
            </>
          )}
        </div>
        {model.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold">{C.model}</h4>
            <ul className="mt-2 space-y-2">
              {model.map((x) => (
                <li key={x.id} className="flex items-start justify-between gap-3 rounded-lg bg-surface2 p-2.5 text-sm text-ink2">
                  {label(x)}
                  <span className="num shrink-0 text-muted">−{x.points}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{C.modelNote}</p>
          </div>
        )}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{f(C.ceiling, { max: QUALITY_START })}</p>
    </section>
  );
}
