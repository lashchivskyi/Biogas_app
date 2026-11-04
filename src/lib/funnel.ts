/**
 * Funnel analytics contract, shared by the browser (`track`) and the server (`/api/events`, payment and report events).
 * Every event is stored on its own with a time, a pseudonymous visit id and, for money events, the order id (the
 * order in the CRM holds the buyer; analytics never copies the e-mail or name). The visit id is a hash of address and
 * browser with a salt that changes every UTC day and is then deleted, so nothing is stored on the device (no cookie,
 * no consent banner) and one visit cannot be followed into the next day. Only listed events and keys pass; a value is
 * a short slug, a finite number or a boolean, so free text, URLs and report tokens never reach the store.
 */
export type FunnelValue = string | number | boolean;
export type FunnelProps = Record<string, FunnelValue>;

const KEYS = {
  // Browser: acquisition and the free screening.
  page_view: ["page", "lang", "entry", "ref", "utm"],
  business_selected: ["source", "business_id", "business_group", "business_role"],
  calculator_start: [],
  calculator_step: ["step"],
  example_loaded: ["id"],
  country_changed: ["country"],
  calculator_submit: ["business_id", "business_group", "business_role", "process_model", "verdict", "confidence", "route", "country", "plant_class", "tonnes_y", "kwe", "capex_keur", "npv_keur", "payback_y"],
  calculator_reset: [],
  advice_ready: ["improving", "combined", "verdict"],
  whatif_applied: ["source"],
  lab_try: ["lever"],
  lab_apply: ["source"],
  lab_save: ["verdict"],
  // Browser: the decision to pay.
  checkout_open: ["plan"],
  checkout_submit: ["plan", "country"],
  checkout_error: ["plan", "status"],
  payment_success: ["plan"],
  // Server: money and delivery (the source of truth for these stages).
  checkout_created: ["plan", "tier", "currency"],
  payment_paid: ["plan", "tier", "currency"],
  payment_closed: ["plan", "status"],
  payment_reversed: ["plan"],
  report_view: ["plan", "age"],
} as const satisfies Record<string, readonly string[]>;

export type FunnelEvent = keyof typeof KEYS;
export const FUNNEL_EVENTS = Object.keys(KEYS) as FunnelEvent[];
/** Events only the server may record; the public endpoint refuses them so a script cannot fake sales. */
export const SERVER_EVENTS: ReadonlySet<FunnelEvent> = new Set(["checkout_created", "payment_paid", "payment_closed", "payment_reversed", "report_view"]);

const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

/** The listed keys of a known event with safe values, or null for an unknown event. Anything else is dropped. */
export function sanitizeEvent(event: string, props: unknown): { event: FunnelEvent; props: FunnelProps } | null {
  if (!Object.hasOwn(KEYS, event)) return null;
  const allowed = KEYS[event as FunnelEvent] as readonly string[];
  const source = props && typeof props === "object" ? (props as Record<string, unknown>) : {};
  const out: FunnelProps = {};
  for (const key of allowed) {
    const v = source[key];
    if (typeof v === "boolean") out[key] = v;
    else if (typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e9) out[key] = Math.round(v * 100) / 100;
    else if (typeof v === "string" && SLUG.test(v)) out[key] = v;
  }
  return { event: event as FunnelEvent, props: out };
}

/** Stable key of a property set, so equal events on one day share one summary row. */
export const dimsKey = (props: FunnelProps) =>
  Object.keys(props).sort().map((k) => `${k}=${props[k]}`).join(";");

export const parseDims = (key: string): FunnelProps =>
  Object.fromEntries(key.split(";").filter(Boolean).map((pair) => {
    const [k, v] = pair.split("=");
    return [k, v === "true" ? true : v === "false" ? false : /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v];
  }));

/** Page class from a path: never the path itself (report URLs carry the private token). */
export function pageClass(pathname: string): string {
  const [, , section = "", sub] = pathname.split("/");
  if (!section) return "home";
  if (section === "biogas") return sub ? "segment" : "segments";
  if (section === "samples") return sub ? "sample" : "samples";
  if (["calculator", "pricing", "methodology", "terms"].includes(section)) return section;
  if (section === "report") return "report";
  if (section === "payment") return "payment";
  return "other";
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia|baidu|naver|seznam|qwant|brave)\./;

/** Where a visit came from, as a class: the referrer itself is never sent. */
export function referrerClass(referrer: string, ownHost: string): "direct" | "internal" | "search" | "other" {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname;
    if (host === ownHost) return "internal";
    return SEARCH.test(host) ? "search" : "other";
  } catch {
    return "other";
  }
}

/** Age bucket of a paid report view: d0 is delivery (incl. mail scanners), later buckets are returns. */
export function ageBucket(paidAt: string | undefined, now = Date.now()): string {
  if (!paidAt) return "unknown";
  const days = (now - Date.parse(paidAt)) / 86_400_000;
  return days < 1 ? "d0" : days < 8 ? "d1_7" : days < 31 ? "d8_30" : "d31p";
}

/**
 * Beta funnel, start to payment and return. Each stage is one event (optionally with a property filter). Two readings:
 * `events` counts every event (a visitor who calculates twice counts twice), `visits` counts distinct visits, where a
 * payment or report view is credited to the visit that created its order, so a payment reported twice counts once.
 */
export const FUNNEL_STAGES: ReadonlyArray<{ id: string; event: FunnelEvent; where?: FunnelProps }> = [
  { id: "visit", event: "page_view", where: { entry: true } },
  { id: "calculator_start", event: "calculator_start" },
  { id: "verdict", event: "calculator_submit" },
  { id: "pricing_view", event: "page_view", where: { page: "pricing" } },
  { id: "checkout_open", event: "checkout_open" },
  { id: "checkout_created", event: "checkout_created" },
  { id: "paid", event: "payment_paid" },
  { id: "report_opened", event: "report_view" },
  { id: "report_return", event: "report_view", where: { age: "d1_7" } },
];

export interface FunnelRow { day: string; event: string; dims: string; count: number }
export interface FunnelRecord { at: string; event: string; visit: string | null; order: string | null; props: FunnelProps }

type Stage = (typeof FUNNEL_STAGES)[number];
/** `report_return` takes every age bucket after day 0. */
const hits = (s: Stage, event: string, props: FunnelProps) =>
  event === s.event && (s.id === "report_return" ? ["d1_7", "d8_30", "d31p"].includes(String(props.age)) : !s.where || Object.entries(s.where).every(([k, v]) => props[k] === v));
const withConversion = <T extends { count: number }>(stages: T[]) =>
  stages.map((s, i) => ({ ...s, ofPrevious: i > 0 && stages[i - 1].count > 0 ? s.count / stages[i - 1].count : null }));

/** Events per day, event and property set. */
export function toDailyRows(events: FunnelRecord[]): FunnelRow[] {
  const rows = new Map<string, FunnelRow>();
  for (const e of events) {
    const day = e.at.slice(0, 10);
    const dims = dimsKey(e.props);
    const key = `${day}|${e.event}|${dims}`;
    const row = rows.get(key) ?? rows.set(key, { day, event: e.event, dims, count: 0 }).get(key)!;
    row.count++;
  }
  return [...rows.values()].sort((a, b) => a.day.localeCompare(b.day) || a.event.localeCompare(b.event) || a.dims.localeCompare(b.dims));
}

/** Stage event counts and step conversion from daily rows. */
export function summarizeFunnel(rows: FunnelRow[]) {
  return withConversion(FUNNEL_STAGES.map((s) => ({
    id: s.id,
    event: s.event,
    count: rows.reduce((sum, r) => (hits(s, r.event, parseDims(r.dims)) ? sum + r.count : sum), 0),
  })));
}

/** Distinct visits per stage. Server events without a visit (webhooks) take the visit that created their order. */
export function summarizeVisits(events: FunnelRecord[]) {
  const visitOfOrder = new Map<string, string>();
  for (const e of events) if (e.event === "checkout_created" && e.order && e.visit && !visitOfOrder.has(e.order)) visitOfOrder.set(e.order, e.visit);
  const who = (e: FunnelRecord) => (e.order ? visitOfOrder.get(e.order) ?? e.visit ?? `order:${e.order}` : e.visit);
  return withConversion(FUNNEL_STAGES.map((s) => {
    const seen = new Set<string>();
    for (const e of events) {
      const id = hits(s, e.event, e.props) ? who(e) : null;
      if (id) seen.add(id);
    }
    return { id: s.id, event: s.event, count: seen.size };
  }));
}
