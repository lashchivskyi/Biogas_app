"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A portal keeps explanations visible outside horizontally scrolling tables. */
export function HelpTooltip({ children, description }: { children: ReactNode; description: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; above: boolean } | null>(null);

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(320, window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: window.innerHeight - rect.bottom < 180 && rect.top > 180 ? rect.top - 8 : rect.bottom + 8,
      above: window.innerHeight - rect.bottom < 180 && rect.top > 180,
    });
  }

  function hideAfterHover() {
    hideTimer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current) setPosition(null);
    }, 150);
  }

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const onOutside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !bubble.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [position]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-describedby={position ? id : undefined}
        className="inline-flex max-w-full cursor-help items-center gap-1.5 rounded text-inherit underline decoration-dotted decoration-line underline-offset-4 outline-offset-4 focus-visible:outline-2 focus-visible:outline-brand"
        onMouseEnter={show}
        onMouseLeave={hideAfterHover}
        onFocus={show}
        onBlur={(event) => { if (!bubble.current?.contains(event.relatedTarget as Node)) setPosition(null); }}
        onClick={show}
      >
        {children}
      </button>
      {position && createPortal(
        <div
          ref={bubble}
          id={id}
          role="tooltip"
          className="fixed z-[100] w-80 max-w-[calc(100vw-24px)] rounded-xl border border-line bg-white p-3 text-left font-sans text-sm font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg"
          style={{ left: position.left, top: position.top, transform: position.above ? "translateY(-100%)" : undefined }}
          onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
          onMouseLeave={hideAfterHover}
        >
          {description}
        </div>,
        document.body,
      )}
    </>
  );
}
