import { sanitizeEvent } from "./funnel";

/**
 * Funnel analytics hook. Sends listed events to our own `/api/events` (one stored event each, pseudonymous visit
 * id made on the server, no cookie, nothing stored on the device; contract in `funnel.ts`) and mirrors them to
 * window.dataLayer for debugging. Unknown events and keys are dropped before anything leaves the browser.
 */
type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function track(event: string, props: Props = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...props });
    const clean = sanitizeEvent(event, props);
    if (!clean) return;
    const body = JSON.stringify({ e: clean.event, p: clean.props });
    if (navigator.sendBeacon?.(`/api/events`, body)) return;
    void fetch(`/api/events`, { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => undefined);
  } catch {
    /* analytics must never break the UI */
  }
}
