/**
 * Decision visuals shared by the result, the paid report and the sample cards. Pure markup (no hooks), so server
 * pages and client components render the same thing. The numbers stay in the surrounding text or table: these
 * marks are aria-hidden and never the only place a value can be read.
 */

const LOSS = "#c0392b";
const GAIN = "#0e7a55";

/** Position of `v` on a 0–100 % scale that always contains zero, with a little air at both ends. */
function scale(values: number[]) {
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  const pad = (hi - lo) * 0.08 || Math.max(1, Math.abs(hi) * 0.1);
  const d0 = lo - pad, d1 = hi + pad;
  return (v: number) => ((v - d0) / (d1 - d0)) * 100;
}

/**
 * NPV of the three scenarios against zero: the loss side is red, the profit side green, the base case is the ringed
 * dot. A range entirely right of zero is a robust "yes", entirely left a clear "no", across zero a grey zone.
 */
export function DecisionRange({ values, labels, names, compact = false }: { values: [number, number, number]; labels?: [string, string, string]; names?: [string, string, string]; compact?: boolean }) {
  const [a, b, c] = values;
  const lo = Math.min(a, c), hi = Math.max(a, c);
  const x = scale([lo, b, hi]);
  const zero = x(0);
  const negEnd = Math.min(hi, 0), posStart = Math.max(lo, 0);
  return (
    <div aria-hidden className="select-none">
      <div className={`relative ${compact ? "h-5" : "h-9"}`}>
        <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${zero}%`, background: `color-mix(in srgb, ${LOSS} 7%, transparent)` }} />
        <div className="absolute inset-y-0 right-0 rounded-r-full" style={{ left: `${zero}%`, background: `color-mix(in srgb, ${GAIN} 7%, transparent)` }} />
        <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
        <div className={`absolute bottom-0 w-px bg-ink/45 ${compact ? "top-0" : "top-3"}`} style={{ left: `${zero}%` }} />
        {!compact && <span className="num absolute top-0 -translate-x-1/2 text-[10px] leading-none text-muted" style={{ left: `${zero}%` }}>{"0"}</span>}
        {lo < 0 && <div className={`absolute top-1/2 -translate-y-1/2 rounded-full ${compact ? "h-1.5" : "h-2.5"}`} style={{ left: `${x(lo)}%`, width: `${Math.max(0.6, x(negEnd) - x(lo))}%`, background: LOSS }} />}
        {hi > 0 && <div className={`absolute top-1/2 -translate-y-1/2 rounded-full ${compact ? "h-1.5" : "h-2.5"}`} style={{ left: `${x(posStart)}%`, width: `${Math.max(0.6, x(hi) - x(posStart))}%`, background: GAIN }} />}
        {!compact && [lo, hi].map((v, i) => <div key={i} className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface" style={{ left: `${x(v)}%`, background: v < 0 ? LOSS : GAIN }} />)}
        <div className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface ${compact ? "h-2.5 w-2.5" : "h-4 w-4"}`} style={{ left: `${x(b)}%`, borderColor: b < 0 ? LOSS : GAIN }} />
      </div>
      {labels && names && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          {[0, 1, 2].map((i) => (
            <div key={i} className={i === 1 ? "text-center" : i === 2 ? "text-right" : ""}>
              <div className="text-muted">{names[i]}</div>
              <div className={`num font-semibold ${i === 1 ? "text-sm text-ink" : "text-ink2"}`}>{labels[i]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** A diverging bar for a table cell: the value against the largest absolute value in the column. */
export function SignedBar({ value, max }: { value: number; max: number }) {
  const w = Math.min(50, (Math.abs(value) / Math.max(1, max)) * 50);
  return (
    <span aria-hidden className="relative inline-block h-2 w-14 shrink-0 rounded-full bg-surface2 align-middle">
      <span className="absolute inset-y-0 left-1/2 w-px bg-ink/30" />
      <span className="absolute inset-y-0 rounded-full" style={value < 0 ? { right: "50%", width: `${w}%`, background: LOSS } : { left: "50%", width: `${w}%`, background: GAIN }} />
    </span>
  );
}
