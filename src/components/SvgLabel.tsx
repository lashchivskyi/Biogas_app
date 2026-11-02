import { fitText } from "@/lib/text-fit";

export interface StackItem { text: string; size: number; bold?: boolean; fill?: string; className?: string; maxLines?: number; minSize?: number }

/**
 * Text block centred inside an SVG box (x = centre, [top, top + height]). Every item is wrapped / shrunk to
 * `width` (see lib/text-fit.ts) and the items are laid out one under the other, so a label that needs two
 * lines in a long language pushes its neighbours instead of overlapping them.
 */
export function SvgStack({ x, top, height, width, items, gap = 5 }: { x: number; top: number; height: number; width: number; items: StackItem[]; gap?: number }) {
  const fitted = items.map((it) => ({ it, f: fitText(it.text, width, it.size, { maxLines: it.maxLines ?? 1, minSize: it.minSize, bold: it.bold }) }));
  const lead = (s: number) => s * 1.2;
  const total = fitted.reduce((h, { f }) => h + f.lines.length * lead(f.size), 0) + gap * (fitted.length - 1);
  const start = top + Math.max(0, (height - total) / 2);
  const tops = fitted.map((_, k) => start + fitted.slice(0, k).reduce((h, { f }) => h + f.lines.length * lead(f.size) + gap, 0));
  return (
    <>
      {fitted.map(({ it, f }, k) => (
        <text key={k} x={x} textAnchor="middle" fontSize={f.size} fontWeight={it.bold ? 700 : undefined} fill={it.fill} className={it.className}>
          {f.lines.map((line, i) => <tspan key={i} x={x} y={tops[k] + (i + 0.8) * lead(f.size)}>{line}</tspan>)}
        </text>
      ))}
    </>
  );
}

/** Single label anchored at start/middle/end (chart axes, legends), wrapped / shrunk to `width`. `y` is the centre line. */
export function SvgLabel({ text, x, y, width, size, maxLines = 1, minSize, bold = false, anchor = "middle", fill }: {
  text: string; x: number; y: number; width: number; size: number; maxLines?: number; minSize?: number; bold?: boolean; anchor?: "start" | "middle" | "end"; fill?: string;
}) {
  const { lines, size: s } = fitText(text, width, size, { maxLines, minSize, bold });
  const lead = s * 1.15;
  const first = y - ((lines.length - 1) * lead) / 2;
  return (
    <text x={x} textAnchor={anchor} fontSize={s} fontWeight={bold ? 700 : undefined} fill={fill}>
      {lines.map((line, i) => <tspan key={i} x={x} y={first + i * lead + s * 0.35}>{line}</tspan>)}
    </text>
  );
}
