import type { ScenarioId, ScenarioResult, SensitivityItem } from "@/core";
import type { Dict } from "@/i18n";

const SCN_COLOR: Record<ScenarioId, string> = { conservative: "#c0392b", base: "#0e7a55", optimistic: "#2f6fdb" };
const f = (s: string, v: string) => s.replace("{v}", v);

/** Cumulative undiscounted cash flow (EUR), for the selected scenarios. Crossing 0 marks payback. */
export function CashFlowChart({ scenarios, t, scn, compact, ids = ["conservative", "base", "optimistic"] }: { scenarios: Record<ScenarioId, ScenarioResult>; t: Dict["charts"]; scn: Dict["labels"]["scenario"]; compact: (v: number) => string; ids?: ScenarioId[] }) {
  const W = 640, H = 260, pl = 56, pr = 16, pt = 14, pb = 30;
  const all = ids.flatMap((id) => scenarios[id].fin.cumulative);
  const n = scenarios.base.fin.cumulative.length;
  const minY = Math.min(0, ...all);
  const maxY = Math.max(0, ...all);
  const pad = (maxY - minY) * 0.06 || 1;
  const y0 = minY - pad, y1 = maxY + pad;
  const x = (i: number) => pl + (i / (n - 1)) * (W - pl - pr);
  const y = (v: number) => pt + (1 - (v - y0) / (y1 - y0)) * (H - pt - pb);
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t.cashAria}>
      {Array.from({ length: ticks + 1 }, (_, k) => {
        const v = y0 + ((y1 - y0) * k) / ticks;
        return (
          <g key={k}>
            <line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#e4e9e3" />
            <text x={pl - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#5b6b64" className="num">{compact(v)}</text>
          </g>
        );
      })}
      <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} stroke="#0f1f1a" strokeWidth="1.2" />
      {Array.from({ length: n }, (_, i) => (i % 3 === 0 ? <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#5b6b64">{i}</text> : null))}
      <text x={W - pr} y={H - 10} textAnchor="end" fontSize="11" fill="#5b6b64">{t.years}</text>
      {ids.map((id) => {
        const c = scenarios[id].fin.cumulative;
        const d = c.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
        return (
          <g key={id}>
            <path d={d} fill="none" stroke={SCN_COLOR[id]} strokeWidth={id === "base" ? 3 : 2} strokeDasharray={id === "base" ? undefined : "5 4"} />
            <circle cx={x(n - 1)} cy={y(c[c.length - 1])} r="3.5" fill={SCN_COLOR[id]} />
          </g>
        );
      })}
      <g transform={`translate(${pl + 8},${pt + 6})`} fontSize="11.5">
        {ids.map((id, i) => (
          <g key={id} transform={`translate(${i * 150},0)`}>
            <line x1="0" x2="16" y1="4" y2="4" stroke={SCN_COLOR[id]} strokeWidth="3" />
            <text x="22" y="8" fill="#33433c">{scn[id]}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Δ NPV for each stress test, relative to base. Red = flips the NPV sign. */
export function Tornado({ items, baseNpv, t, compact }: { items: SensitivityItem[]; baseNpv: number; t: Dict["charts"]; compact: (v: number) => string }) {
  const rowH = 30, W = 640, labelW = 210, pad = 10;
  const H = items.length * rowH + 28;
  const maxAbs = Math.max(1, ...items.map((i) => Math.abs(i.deltaNpvEur)));
  const mid = labelW + (W - labelW - pad) / 2;
  const scale = ((W - labelW - pad) / 2 - 62) / maxAbs;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t.sensAria}>
      <text x={mid} y="12" textAnchor="middle" fontSize="11" fill="#5b6b64">{f(t.sensHeader, compact(baseNpv))}</text>
      <line x1={mid} x2={mid} y1="20" y2={H} stroke="#0f1f1a" />
      {items.map((it, k) => {
        const yy = 26 + k * rowH;
        const w = Math.abs(it.deltaNpvEur) * scale;
        const neg = it.deltaNpvEur < 0;
        return (
          <g key={it.id}>
            <text x={labelW - 10} y={yy + 15} textAnchor="end" fontSize="12.5" fill="#33433c">{it.label}</text>
            <rect x={neg ? mid - w : mid} y={yy + 3} width={Math.max(w, 1.5)} height={rowH - 10} rx="3" fill={it.breaks ? "#c0392b" : neg ? "#e08e7d" : "#7fb99f"} />
            <text x={neg ? mid - w - 6 : mid + w + 6} y={yy + 16} textAnchor={neg ? "end" : "start"} fontSize="11.5" className="num" fill="#33433c">{compact(it.deltaNpvEur)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ScoreBar({ value, isRisk, label }: { value: number; isRisk: boolean; label: string }) {
  const good = isRisk ? 100 - value : value;
  const color = good >= 65 ? "bg-good" : good >= 40 ? "bg-warn" : "bg-bad";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface2" role="img" aria-label={label}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}
