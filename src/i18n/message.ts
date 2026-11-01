/**
 * Small ICU MessageFormat subset on top of Intl.PluralRules (CLDR plural rules for every locale):
 *
 *   {name}                                           plain value, left visible when missing
 *   {n, plural, =0{none} one{# check} other{# checks}}   CLDR category (zero one two few many other) or exact =N; # = n via Intl.NumberFormat
 *   {x, select, a{…} b{…} other{…}}                  exact string match
 *
 * Extension: a plural may define `decimal{…}`, used for non-integers before the CLDR category. Needed where the
 * integer `other` differs from the fraction form (Serbian: "5 provera" but "1,5 provere").
 *
 * Bodies may nest further arguments. Not supported (not needed, and apostrophes are ordinary characters
 * in Ukrainian, French and Italian): ICU apostrophe quoting, `offset:`, selectordinal, number/date skeletons.
 * Why not intl-messageformat: ~15 kB of parser for features we never author, and one more dependency to audit.
 */
export type MessageVars = Record<string, string | number>;

type Part = string | { pound: true } | Arg;
interface Arg { name: string; kind: "plain" | "plural" | "select"; cases: Map<string, Part[]> }

const CATEGORIES = ["zero", "one", "two", "few", "many", "other"] as const;

class MessageSyntaxError extends Error {}

function parseSeq(s: string, start: number, inCase: boolean, inPlural: boolean): { parts: Part[]; end: number } {
  const parts: Part[] = [];
  let text = "";
  const flush = () => { if (text) { parts.push(text); text = ""; } };
  let i = start;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      flush();
      const arg = parseArg(s, i, inPlural);
      parts.push(arg.arg);
      i = arg.end;
    } else if (ch === "}") {
      if (!inCase) throw new MessageSyntaxError(`unmatched } at ${i}`);
      flush();
      return { parts, end: i };
    } else if (ch === "#" && inPlural) {
      flush();
      parts.push({ pound: true });
    } else text += ch;
  }
  if (inCase) throw new MessageSyntaxError("unclosed {");
  flush();
  return { parts, end: i };
}

/** `s[at]` is `{`; returns the index of the matching `}`. */
function parseArg(s: string, at: number, inPlural: boolean): { arg: Arg; end: number } {
  const head = /^\{\s*(\w+)\s*(\}|,\s*(plural|select)\s*,)/.exec(s.slice(at));
  if (!head) throw new MessageSyntaxError(`bad argument at ${at}`);
  const name = head[1];
  if (head[2] === "}") return { arg: { name, kind: "plain", cases: new Map() }, end: at + head[0].length - 1 };
  const kind = head[3] as "plural" | "select";
  const cases = new Map<string, Part[]>();
  let i = at + head[0].length;
  for (;;) {
    while (/\s/.test(s[i] ?? "")) i++;
    if (s[i] === "}") break;
    const sel = /^[\w=]+/.exec(s.slice(i));
    if (!sel) throw new MessageSyntaxError(`bad case selector at ${i}`);
    i += sel[0].length;
    while (/\s/.test(s[i] ?? "")) i++;
    if (s[i] !== "{") throw new MessageSyntaxError(`expected { after "${sel[0]}"`);
    const body = parseSeq(s, i + 1, true, kind === "plural" || inPlural);
    if (cases.has(sel[0])) throw new MessageSyntaxError(`duplicate case "${sel[0]}"`);
    cases.set(sel[0], body.parts);
    i = body.end + 1;
  }
  if (!cases.has("other")) throw new MessageSyntaxError(`${name}: "other" case is required`);
  return { arg: { name, kind, cases }, end: i };
}

const parsed = new Map<string, Part[]>();
/** Parsed message (cached). Throws MessageSyntaxError on malformed input. */
export function parseMessage(s: string): Part[] {
  let p = parsed.get(s);
  if (!p) {
    p = parseSeq(s, 0, false, false).parts;
    parsed.set(s, p);
  }
  return p;
}

const rules = new Map<string, Intl.PluralRules>();
const numbers = new Map<string, Intl.NumberFormat>();
const pluralRules = (tag: string) => rules.get(tag) ?? (rules.set(tag, new Intl.PluralRules(tag)), rules.get(tag)!);
const numberFormat = (tag: string) => numbers.get(tag) ?? (numbers.set(tag, new Intl.NumberFormat(tag)), numbers.get(tag)!);

/** Integers and strings print as given (callers pre-format money and large numbers); a fractional number gets the locale decimal mark. */
const plain = (v: string | number, tag: string) => (typeof v === "number" && !Number.isInteger(v) ? numberFormat(tag).format(v) : String(v));

function render(parts: Part[], vars: MessageVars, tag: string, pound?: number): string {
  let out = "";
  for (const p of parts) {
    if (typeof p === "string") out += p;
    else if ("pound" in p) out += pound === undefined ? "#" : numberFormat(tag).format(pound);
    else if (!(p.name in vars)) out += `{${p.name}}`;
    else if (p.kind === "plain") out += plain(vars[p.name], tag);
    else if (p.kind === "select") out += render(p.cases.get(String(vars[p.name])) ?? p.cases.get("other")!, vars, tag, pound);
    else {
      const n = Number(vars[p.name]);
      const body = p.cases.get(`=${n}`) ?? (Number.isInteger(n) ? undefined : p.cases.get("decimal")) ?? p.cases.get(pluralRules(tag).select(n)) ?? p.cases.get("other")!;
      out += render(body, vars, tag, n);
    }
  }
  return out;
}

/** Fast path for the historic `{name}` only form (no plural/select), identical to the previous behaviour. */
const SIMPLE = /\{(\w+)\}/g;
const hasIcu = (s: string) => /\{\s*\w+\s*,/.test(s);

/**
 * Interpolates `vars` into `s`. Plain strings behave as before (unknown names stay visible so missing data is noticed);
 * `{n, plural, …}` follows the CLDR rules of `tag` (a BCP-47 tag such as INTL_TAG[locale]).
 * A malformed message falls back to plain interpolation instead of breaking the page; the QA tests keep none in the dictionaries.
 */
export function formatMessage(s: string, vars: MessageVars, tag: string): string {
  const simple = () => s.replace(SIMPLE, (m, k) => (k in vars ? plain(vars[k], tag) : m));
  if (!hasIcu(s)) return simple();
  try {
    return render(parseMessage(s), vars, tag);
  } catch (e) {
    if (!(e instanceof MessageSyntaxError)) throw e;
    return simple();
  }
}

// ---- introspection for the QA tests ---------------------------------------------------------------------------

/** Every argument name used anywhere in the message (sorted, unique). Throws MessageSyntaxError when malformed. */
export function messageArgs(s: string): string[] {
  const names = new Set<string>();
  const walk = (parts: Part[]) => {
    for (const p of parts) if (typeof p !== "string" && !("pound" in p)) { names.add(p.name); for (const body of p.cases.values()) walk(body); }
  };
  walk(parseMessage(s));
  return [...names].sort();
}

/** Plural arguments with the case selectors they define. */
export function pluralCases(s: string): { name: string; selectors: string[] }[] {
  const out: { name: string; selectors: string[] }[] = [];
  const walk = (parts: Part[]) => {
    for (const p of parts) if (typeof p !== "string" && !("pound" in p)) {
      if (p.kind === "plural") out.push({ name: p.name, selectors: [...p.cases.keys()] });
      for (const body of p.cases.values()) walk(body);
    }
  };
  walk(parseMessage(s));
  return out;
}

/** Categories a locale really produces for the numbers we show: integers 0–1000 and a few decimals. */
export function usedCategories(tag: string): string[] {
  const pr = pluralRules(tag);
  const seen = new Set<string>();
  for (let n = 0; n <= 1000; n++) seen.add(pr.select(n));
  for (const n of [0.5, 1.5, 2.5, 5.5, 10.5, 21.5]) seen.add(pr.select(n));
  return CATEGORIES.filter((c) => seen.has(c));
}

/** The message as one representative string for text rules (units, scripts, glossary): `other` bodies, `#` → `{arg}`. */
export function flattenMessage(s: string): string {
  if (!hasIcu(s)) return s;
  const walk = (parts: Part[], pound?: string): string =>
    parts.map((p) => {
      if (typeof p === "string") return p;
      if ("pound" in p) return pound ? `{${pound}}` : "#";
      if (p.kind === "plain") return `{${p.name}}`;
      return walk(p.cases.get("other")!, p.kind === "plural" ? p.name : pound);
    }).join("");
  try { return walk(parseMessage(s)); } catch { return s; }
}

export { MessageSyntaxError };
