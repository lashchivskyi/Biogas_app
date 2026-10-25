/** Minimal stroke icon set (24px grid) — keeps the bundle free of an icon library. */
const PATHS = {
  leaf: "M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16zM4 20c4-4 7-6 10-8",
  flame: "M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-2 1-3.5 2-5 1 1 2 1.5 3 1-1-3 0-5 1-7z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8z",
  heat: "M8 4c-2 3 2 4 0 7s2 4 0 7M14 4c-2 3 2 4 0 7s2 4 0 7M20 4c-2 3 2 4 0 7s2 4 0 7",
  check: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12M18 6 6 18",
  scale: "M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0L6 7zm12 0-3 7a3 3 0 0 0 6 0l-3-7z",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  factory: "M3 21V10l6 4V10l6 4V6h6v15zM7 17h2M12 17h2M17 17h2",
  cow: "M5 9c0-3 2-5 4-5h6c2 0 4 2 4 5v5a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5zM9 14h.01M15 14h.01M3 7l2 2M21 7l-2 2",
  menu: "M4 7h16M4 12h16M4 17h16",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
