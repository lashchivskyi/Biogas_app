/**
 * Methalytics mark: a methane molecule (CH₄) whose two front bonds form a check mark —
 * carbon at the vertex, hydrogens at the ends, the other two hydrogens behind (depth).
 * "The verdict is in the molecule." Same geometry as the 3D emblem (three/MoleculeEmblem.ts).
 *
 * `animated`: the rear bonds sway as the molecule turns in depth, and every 9 s the check is redrawn
 * and the front hydrogens flash — the same rhythm as the 3D emblem's "verdict pose". CSS only
 * (globals.css, `.lm-*`), GPU-friendly transforms, disabled for prefers-reduced-motion.
 */
export function LogoMark({ size = 32, className = "", animated = false }: { size?: number; className?: string; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={`${animated ? "lm-animated" : ""} ${className}`} aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" fill="#0b1d16" />
      {/* rear bonds (depth) */}
      <g className="lm-rear">
        <path d="M13.2 20.6 L20.6 25.4 M13.2 20.6 L8.6 26" stroke="#3ddc97" strokeOpacity=".35" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="20.6" cy="25.4" r="1.7" fill="#e8a521" />
        <circle cx="8.6" cy="26" r="1.5" fill="#ffffff" fillOpacity=".45" />
      </g>
      {/* front bonds = the check */}
      <path className="lm-check" pathLength={100} d="M7.2 14.6 L13.2 20.6 L24.6 8.2" stroke="#3ddc97" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="lm-h lm-h1" cx="7.2" cy="14.6" r="2.3" fill="#ffffff" />
      <circle className="lm-h lm-h2" cx="24.6" cy="8.2" r="2.6" fill="#ffffff" />
      <circle className="lm-c" cx="13.2" cy="20.6" r="3.3" fill="#3ddc97" stroke="#0b1d16" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ dark = true, showDescriptor = true, descriptor, animated = false }: { dark?: boolean; showDescriptor?: boolean; descriptor?: string; animated?: boolean }) {
  const text = dark ? "text-white" : "text-ink";
  const sub = dark ? "text-white/55" : "text-muted";
  return (
    <span className="group/logo inline-flex items-center gap-2.5">
      <LogoMark size={34} animated={animated} />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[18px] font-semibold tracking-tight ${text}`}>
          metha<span className="text-signal">lytics</span>
        </span>
        {showDescriptor && descriptor && <span className={`mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.14em] sm:block ${sub}`}>{descriptor}</span>}
      </span>
    </span>
  );
}
