"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { pageClass, referrerClass } from "@/lib/funnel";

/**
 * One `page_view` per client navigation: page class, language, whether the visit entered here (first page of
 * this tab load) and where from, as classes. A short utm_source slug is kept for beta invitations; nothing else.
 */
export function PageView({ lang }: { lang: string }) {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const entry = first.current;
    first.current = false;
    const utm = entry ? new URLSearchParams(window.location.search).get("utm_source")?.toLowerCase() : undefined;
    track("page_view", {
      page: pageClass(pathname),
      lang,
      entry,
      ...(entry ? { ref: referrerClass(document.referrer, window.location.hostname) } : {}),
      ...(utm ? { utm } : {}),
    });
  }, [pathname, lang]);
  return null;
}
