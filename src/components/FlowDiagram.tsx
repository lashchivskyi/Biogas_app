import type { Dict } from "@/i18n";
import { sig2 } from "@/lib/format";
import { SvgStack } from "./SvgLabel";

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
        <SvgStack x={89} top={112} height={106} width={136} items={[
          { text: t.feedstock, size: 14, bold: true, fill: ink, maxLines: 2 },
          { text: t.feedstockSub1, size: 11.5, fill: sub, maxLines: 2, minSize: 9.5 },
          { text: t.feedstockSub2, size: 11.5, fill: sub, maxLines: 2, minSize: 9.5 },
          ...(e ? [{ text: V(t.tYr, n0(sig2(e.tonnes))), size: 13, bold: true, className: "num", fill: "#5f8a3a" }] : []),
        ]} />
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
        <SvgStack x={315} top={97} height={70} width={136} items={[
          { text: t.digester, size: 14, bold: true, fill: ink, maxLines: 2 },
          { text: t.digesterSub, size: 11.5, fill: sub, maxLines: 2, minSize: 9.5 },
          ...(e ? [{ text: V(t.ownHeat, n0(sig2(e.heatDigesterMwh))), size: 12, className: "num", fill: sub, maxLines: 2, minSize: 9.5 }] : []),
        ]} />
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={270 + i * 30} cy="220" r="4" fill="#d99a12" className="bubble" style={{ animationDelay: `${i * 0.7}s` }} />
        ))}
      </g>

      {/* Digester → biogas */}
      <path d="M390 150 H464" stroke="#d99a12" strokeWidth={sw(max * 0.7)} fill="none" className="flow-line" strokeLinecap="round" />

      {/* Biogas holder */}
      <g>
        <rect x="466" y="108" width="110" height="84" rx="42" fill={nodeFill} stroke="#d99a12" strokeWidth="1.5" />
        <SvgStack x={521} top={112} height={76} width={88} items={[
          { text: t.biogas, size: 14, bold: true, fill: ink },
          e ? { text: V(t.m3Yr, compact(sig2(e.biogasM3))), size: 12, bold: true, className: "num", fill: "#d99a12" } : { text: "CH₄ + CO₂", size: 11.5, fill: sub },
        ]} />
      </g>

      {/* Biogas → converter */}
      <path d="M576 150 H640" stroke="#d99a12" strokeWidth={sw(max * 0.7)} fill="none" className="flow-line" strokeLinecap="round" />

      {/* Converter */}
      <g>
        <rect x="642" y="100" width="130" height="100" rx="14" fill={nodeFill} stroke={nodeStroke} />
        <SvgStack x={707} top={102} height={96} width={116} items={[
          { text: isBio ? t.bio : e?.route === "boiler" ? t.boiler : t.chp, size: 14, bold: true, fill: ink, maxLines: 2 },
          { text: isBio ? t.bioSub1 : e?.route === "boiler" ? t.boilerSub : t.chpSub1, size: 11.5, fill: sub, maxLines: 2, minSize: 9.5 },
          ...(isBio || e?.route !== "boiler" ? [{ text: isBio ? t.bioSub2 : t.chpSub2, size: 11.5, fill: sub, maxLines: 2, minSize: 9.5 }] : []),
        ]} />
      </g>

      {/* Outputs */}
      {/* electricity (top) */}
      <path d="M772 125 C 810 125, 810 62, 846 62" stroke="#2f6fdb" strokeWidth={e ? sw(elTotal) : 6} fill="none" className="flow-line" strokeLinecap="round" opacity={e && elTotal === 0 ? 0.15 : 1} />
      <g>
        <rect x="848" y="30" width="120" height="64" rx="12" fill={nodeFill} stroke="#2f6fdb" strokeWidth="1.5" />
        <SvgStack x={908} top={32} height={60} width={108} items={[
          { text: isBio ? t.gasToGrid : t.electricity, size: 13.5, bold: true, fill: ink, maxLines: 2 },
          { text: e ? (isBio ? V(t.nm3, compact(sig2(e.biomethaneNm3))) : V(t.mwh, n0(sig2(elTotal)))) : t.forOwnUse, size: 12, bold: true, className: "num", fill: "#2f6fdb", maxLines: 2, minSize: 9.5 },
        ]} />
      </g>

      {/* heat useful (middle) */}
      <path d="M772 150 H846" stroke="#e0562c" strokeWidth={e ? sw(e.heatUsefulMwh) : 6} fill="none" className="flow-line" strokeLinecap="round" opacity={e && e.heatUsefulMwh === 0 ? 0.15 : 1} />
      <g>
        <rect x="848" y="120" width="120" height="64" rx="12" fill={nodeFill} stroke="#e0562c" strokeWidth="1.5" />
        <SvgStack x={908} top={122} height={60} width={108} items={[
          { text: t.usefulHeat, size: 13.5, bold: true, fill: ink, maxLines: 2 },
          { text: e ? V(t.mwh, n0(sig2(e.heatUsefulMwh))) : t.ifUser, size: 12, bold: true, className: "num", fill: "#e0562c", maxLines: 2, minSize: 9.5 },
        ]} />
      </g>

      {/* heat lost (bottom of outputs) */}
      <path d="M772 175 C 806 175, 806 232, 846 232" stroke={dark ? "#9db3a8" : "#9aa7a0"} strokeWidth={e ? sw(e.heatLostMwh) : 3} fill="none" className="flow-line-slow" strokeLinecap="round" strokeDasharray="2 6" opacity={e && e.heatLostMwh === 0 ? 0.15 : 0.9} />
      <g>
        <rect x="848" y="204" width="120" height="56" rx="12" fill="none" stroke={nodeStroke} strokeDasharray="4 4" />
        <SvgStack x={908} top={206} height={52} width={108} items={[
          { text: t.heatNoDemand, size: 12.5, fill: sub, maxLines: 2, minSize: 10 },
          { text: e ? V(t.mwh, n0(sig2(e.heatLostMwh))) : t.notIncome, size: 12, className: "num", fill: sub, maxLines: 2, minSize: 9.5 },
        ]} />
      </g>

      {/* digestate */}
      <path d="M315 245 V292 H846" stroke="#7b5c3b" strokeWidth={e ? 6 : 5} fill="none" className="flow-line-slow" strokeLinecap="round" />
      <g>
        <rect x="848" y="270" width="120" height="64" rx="12" fill={nodeFill} stroke="#7b5c3b" strokeWidth="1.5" />
        <SvgStack x={908} top={272} height={60} width={108} items={[
          { text: t.digestate, size: 13.5, bold: true, fill: ink, maxLines: 2, minSize: 10.5 },
          { text: e ? V(t.tYr, n0(sig2(e.digestateT))) : t.assetOrCost, size: 12, bold: true, className: "num", fill: "#7b5c3b", minSize: 9.5 },
        ]} />
      </g>
    </svg>
  );
}
