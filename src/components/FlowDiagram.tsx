import type { Dict } from "@/i18n";
import { sig2 } from "@/lib/format";

export interface FlowValues {
  tonnes: number;
  biogasM3: number;
  route: "chp" | "boiler" | "biomethane";
  elMwhSelf: number;
  elMwhExport: number;
  heatUsefulMwh: number;
  heatLostMwh: number; // net heat that finds no user
  heatDigesterMwh: number;
  biomethaneNm3: number;
  digestateT: number;
}

/**
 * Animated process diagram: Feedstock → Digester → Biogas → CHP/Biomethane → Energy → Digestate.
 * Stroke widths are proportional to energy, so a thin heat arrow is visibly "wasted" heat.
 * Without `values` it renders the conceptual diagram used on the home page.
 */
export function FlowDiagram({ values, dark = false, t, n0, compact }: { values?: FlowValues; dark?: boolean; t: Dict["flow"]; n0: (v: number) => string; compact: (v: number) => string }) {
  const V = (s: string, v: string) => s.replace("{v}", v);
  const ink = dark ? "#eaf3ee" : "#0f1f1a";
  const sub = dark ? "#9db3a8" : "#5b6b64";
  const nodeFill = dark ? "rgba(255,255,255,0.06)" : "#ffffff";
  const nodeStroke = dark ? "rgba(255,255,255,0.22)" : "#dbe1da";

  const e = values;
  const elTotal = e ? e.elMwhSelf + e.elMwhExport : 0;
  const heatAll = e ? e.heatUsefulMwh + e.heatLostMwh : 0;
  const max = e ? Math.max(elTotal, heatAll, e.heatDigesterMwh, 1) : 1;
  const sw = (v: number) => (e ? Math.max(2.5, Math.min(18, 3 + (v / max) * 15)) : 6);
  const isBio = e?.route === "biomethane";

  return (
    <svg viewBox="0 0 980 340" role="img" aria-label={t.aria} className="h-auto w-full">

      {/* Feedstock */}
      <g>
        <rect x="14" y="110" width="150" height="110" rx="14" fill={nodeFill} stroke={nodeStroke} />
        <text x="89" y="140" textAnchor="middle" fontSize="14" fontWeight="700" fill={ink}>{t.feedstock}</text>
        <text x="89" y="160" textAnchor="middle" fontSize="11.5" fill={sub}>{t.feedstockSub1}</text>
        <text x="89" y="180" textAnchor="middle" fontSize="11.5" fill={sub}>{t.feedstockSub2}</text>
        {e && <text x="89" y="206" textAnchor="middle" fontSize="13" fontWeight="700" className="num" fill="#5f8a3a">{V(t.tYr, n0(sig2(e.tonnes)))}</text>}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={40 + i * 24} cy="92" r="6" fill="#5f8a3a" opacity={0.85 - i * 0.15} />
        ))}
      </g>

      {/* Feedstock → digester */}
      <path d="M164 165 H238" stroke="#5f8a3a" strokeWidth={sw(max * 0.5)} fill="none" className="flow-line-slow" strokeLinecap="round" />

      {/* Digester */}
      <g>
        <rect x="240" y="95" width="150" height="150" rx="18" fill={nodeFill} stroke={nodeStroke} />
        <path d="M240 190 Q 277 176 315 190 T 390 190 V227 a18 18 0 0 1 -18 18 H258 a18 18 0 0 1 -18 -18 z" fill="#d99a12" opacity="0.18" />
        <text x="315" y="124" textAnchor="middle" fontSize="14" fontWeight="700" fill={ink}>{t.digester}</text>
        <text x="315" y="142" textAnchor="middle" fontSize="11.5" fill={sub}>{t.digesterSub}</text>
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={270 + i * 30} cy="220" r="4" fill="#d99a12" className="bubble" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
        {e && <text x="315" y="168" textAnchor="middle" fontSize="12" className="num" fill={sub}>{V(t.ownHeat, n0(sig2(e.heatDigesterMwh)))}</text>}
      </g>

      {/* Digester → biogas */}
      <path d="M390 150 H464" stroke="#d99a12" strokeWidth={sw(max * 0.7)} fill="none" className="flow-line" strokeLinecap="round" />

      {/* Biogas holder */}
      <g>
        <rect x="466" y="108" width="110" height="84" rx="42" fill={nodeFill} stroke="#d99a12" strokeWidth="1.5" />
        <text x="521" y="146" textAnchor="middle" fontSize="14" fontWeight="700" fill={ink}>{t.biogas}</text>
        {e ? (
          <text x="521" y="166" textAnchor="middle" fontSize="12" className="num" fill="#d99a12" fontWeight="700">{V(t.m3Yr, compact(sig2(e.biogasM3)))}</text>
        ) : (
          <text x="521" y="166" textAnchor="middle" fontSize="11.5" fill={sub}>CH₄ + CO₂</text>
        )}
      </g>

      {/* Biogas → converter */}
      <path d="M576 150 H640" stroke="#d99a12" strokeWidth={sw(max * 0.7)} fill="none" className="flow-line" strokeLinecap="round" />

      {/* Converter */}
      <g>
        <rect x="642" y="100" width="130" height="100" rx="14" fill={nodeFill} stroke={nodeStroke} />
        <text x="707" y="130" textAnchor="middle" fontSize="14" fontWeight="700" fill={ink}>{isBio ? t.bio : e?.route === "boiler" ? t.boiler : t.chp}</text>
        <text x="707" y="150" textAnchor="middle" fontSize="11.5" fill={sub}>{isBio ? t.bioSub1 : e?.route === "boiler" ? t.boilerSub : t.chpSub1}</text>
        <text x="707" y="170" textAnchor="middle" fontSize="11.5" fill={sub}>{isBio ? t.bioSub2 : t.chpSub2}</text>
      </g>

      {/* Outputs */}
      {/* electricity (top) */}
      <path d="M772 125 C 810 125, 810 62, 846 62" stroke="#2f6fdb" strokeWidth={e ? sw(elTotal) : 6} fill="none" className="flow-line" strokeLinecap="round" opacity={e && elTotal === 0 ? 0.15 : 1} />
      <g>
        <rect x="848" y="30" width="120" height="64" rx="12" fill={nodeFill} stroke="#2f6fdb" strokeWidth="1.5" />
        <text x="908" y="54" textAnchor="middle" fontSize="13.5" fontWeight="700" fill={ink}>{isBio ? t.gasToGrid : t.electricity}</text>
        <text x="908" y="76" textAnchor="middle" fontSize="12" className="num" fontWeight="700" fill="#2f6fdb">
          {e ? (isBio ? V(t.nm3, compact(sig2(e.biomethaneNm3))) : V(t.mwh, n0(sig2(elTotal)))) : t.forOwnUse}
        </text>
      </g>

      {/* heat useful (middle) */}
      <path d="M772 150 H846" stroke="#e0562c" strokeWidth={e ? sw(e.heatUsefulMwh) : 6} fill="none" className="flow-line" strokeLinecap="round" opacity={e && e.heatUsefulMwh === 0 ? 0.15 : 1} />
      <g>
        <rect x="848" y="120" width="120" height="64" rx="12" fill={nodeFill} stroke="#e0562c" strokeWidth="1.5" />
        <text x="908" y="144" textAnchor="middle" fontSize="13.5" fontWeight="700" fill={ink}>{t.usefulHeat}</text>
        <text x="908" y="166" textAnchor="middle" fontSize="12" className="num" fontWeight="700" fill="#e0562c">{e ? V(t.mwh, n0(sig2(e.heatUsefulMwh))) : t.ifUser}</text>
      </g>

      {/* heat lost (bottom of outputs) */}
      <path d="M772 175 C 806 175, 806 232, 846 232" stroke={dark ? "#9db3a8" : "#9aa7a0"} strokeWidth={e ? sw(e.heatLostMwh) : 3} fill="none" className="flow-line-slow" strokeLinecap="round" strokeDasharray="2 6" opacity={e && e.heatLostMwh === 0 ? 0.15 : 0.9} />
      <g>
        <rect x="848" y="204" width="120" height="56" rx="12" fill="none" stroke={nodeStroke} strokeDasharray="4 4" />
        <text x="908" y="228" textAnchor="middle" fontSize="12.5" fontWeight="600" fill={sub}>{t.heatNoDemand}</text>
        <text x="908" y="248" textAnchor="middle" fontSize="12" className="num" fill={sub}>{e ? V(t.mwh, n0(sig2(e.heatLostMwh))) : t.notIncome}</text>
      </g>

      {/* digestate */}
      <path d="M315 245 V292 H846" stroke="#7b5c3b" strokeWidth={e ? 6 : 5} fill="none" className="flow-line-slow" strokeLinecap="round" />
      <g>
        <rect x="848" y="274" width="120" height="52" rx="12" fill={nodeFill} stroke="#7b5c3b" strokeWidth="1.5" />
        <text x="908" y="296" textAnchor="middle" fontSize="13.5" fontWeight="700" fill={ink}>{t.digestate}</text>
        <text x="908" y="315" textAnchor="middle" fontSize="12" className="num" fill="#7b5c3b" fontWeight="700">{e ? V(t.tYr, n0(sig2(e.digestateT))) : t.assetOrCost}</text>
      </g>
    </svg>
  );
}
