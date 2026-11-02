/**
 * Fits a label into a fixed-width SVG box. SVG <text> never wraps, and 25 languages run 30–60 % longer than
 * English, so a label is split at spaces (at most `maxLines`) and, if one line is still too wide, its font size
 * is reduced down to `minSize`. Widths are estimates in em per character class (conservative); the visual
 * check in .claude/skills/localization measures the real rendering.
 */
const EM = { latin: 0.62, wide: 0.7, thai: 0.52, digit: 0.64, space: 0.28 };

const isWide = (c: number) => (c >= 0x370 && c <= 0x52f) || (c >= 0x1e00 && c <= 0x1fff); // Greek, Cyrillic
const isThai = (c: number) => c >= 0xe00 && c <= 0xe7f;

/** Estimated rendered width of `text` at `size` px (bold ≈ +6 %). */
export function textWidth(text: string, size: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    em += ch === " " ? EM.space : c >= 48 && c <= 57 ? EM.digit : isThai(c) ? EM.thai : isWide(c) ? EM.wide : EM.latin;
  }
  return em * size * (bold ? 1.06 : 1);
}

export interface Fitted { lines: string[]; size: number }

export function fitText(text: string, width: number, size: number, opts: { maxLines?: number; minSize?: number; bold?: boolean } = {}): Fitted {
  const { maxLines = 1, minSize = Math.max(9, size * 0.75), bold = false } = opts;
  // Thai has no spaces: break at ICU word boundaries and join without a separator.
  const thai = text.split("").some((ch) => isThai(ch.charCodeAt(0))) && !/\s/.test(text.trim());
  const words = thai ? [...new Intl.Segmenter("th", { granularity: "word" }).segment(text)].map((x) => x.segment) : text.split(/[ \t\n]+/).filter(Boolean); // only ordinary spaces break: a no-break space keeps "1 200" together
  const sep = thai ? "" : " ";
  const wrap = (s: number, limit = maxLines): string[] | null => {
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur}${sep}${w}` : w;
      if (!cur || textWidth(next, s, bold) <= width) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length <= limit && lines.every((l) => textWidth(l, s, bold) <= width) ? lines : null;
  };
  for (let s = size; s >= minSize - 0.01; s -= 0.5) {
    const lines = wrap(s);
    if (lines) return { lines, size: s };
  }
  // One more line at the smallest size before giving up (long compounds in de, sv, fi, nl…).
  const extra = wrap(minSize, maxLines + 1);
  if (extra) return { lines: extra, size: minSize };
  // Unspaced scripts (Thai) or a very long word: one line at the smallest size, the browser clips nothing because the box is only a guide.
  return { lines: [text], size: minSize };
}
