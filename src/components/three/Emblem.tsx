"use client";

import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../brand/Logo";

/**
 * 3D brand emblem with progressive enhancement: the SVG mark renders first (and stays for no-WebGL
 * and reduced-motion users); three.js is code-split and only animates while on screen.
 */
export function Emblem({ size = 160, className = "" }: { size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      try {
        const test = document.createElement("canvas");
        if (!(test.getContext("webgl2") || test.getContext("webgl"))) return;
      } catch {
        return;
      }
      const { MoleculeEmblem } = await import("./MoleculeEmblem");
      if (cancelled) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let em: InstanceType<typeof MoleculeEmblem>;
      try {
        em = new MoleculeEmblem(canvas, { reducedMotion });
      } catch {
        return;
      }
      em.resize(canvas.clientWidth, canvas.clientHeight);
      setReady(true);
      const io = new IntersectionObserver(([e]) => (e.isIntersecting && document.visibilityState === "visible" ? em.start() : em.stop()));
      io.observe(canvas);
      const onVis = () => (document.visibilityState === "visible" ? em.start() : em.stop());
      document.addEventListener("visibilitychange", onVis);
      cleanup = () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        em.dispose();
      };
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden>
      <div className={`absolute inset-0 grid place-items-center transition-opacity duration-700 ${ready ? "opacity-0" : "opacity-100"}`}>
        <LogoMark size={Math.round(size * 0.55)} />
      </div>
      <canvas ref={ref} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
