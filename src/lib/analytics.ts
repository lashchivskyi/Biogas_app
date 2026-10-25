/**
 * Minimal analytics hook. Pushes to window.dataLayer (GTM/GA4 pick it up when NEXT_PUBLIC_GTM_ID is set
 * in the layout later). Never sends personal data — only event names and coarse properties.
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
  } catch {
    /* analytics must never break the UI */
  }
}
