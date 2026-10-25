"use client";

import { useEffect, useRef, useState } from "react";
import type { ChapterId, ProcessScene } from "./ProcessScene";

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Full-screen cinematic background. Progressive enhancement:
 *  1. a CSS "poster" renders immediately (no JS, no layout shift, text is the LCP);
 *  2. three.js is code-split and loaded only in the browser, after hydration;
 *  3. quality adapts to device (no bloom / fewer particles on small or weak devices, Save-Data);
 *  4. prefers-reduced-motion → still frames that change per chapter, no continuous animation;
 *  5. rendering pauses when the section is off-screen or the tab is hidden.
 */
export function SceneCanvas({ chapter, active }: { chapter: ChapterId; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ProcessScene | null>(null);
  const activeRef = useRef(active);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    activeRef.current = active;
    const s = sceneRef.current;
    if (!s) return;
    if (active && document.visibilityState === "visible") s.start();
    else s.stop();
  }, [active]);

  useEffect(() => {
    sceneRef.current?.setChapter(chapter);
  }, [chapter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !webglAvailable()) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const { ProcessScene } = await import("./ProcessScene");
      if (cancelled) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
      const weak = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || !!nav.connection?.saveData;
      let scene: ProcessScene;
      try {
        scene = new ProcessScene(canvas, { quality: weak ? "low" : "high", reducedMotion });
      } catch {
        return; // keep the poster
      }
      sceneRef.current = scene;
      scene.onFirstFrame = () => setReady(true);

      const resize = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      let pending = false;
      const onPointer = (e: PointerEvent) => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          scene.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
        });
      };
      const onVis = () => {
        if (document.visibilityState === "visible" && activeRef.current) scene.start();
        else scene.stop();
      };
      if (!reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVis);
      if (activeRef.current) scene.start();

      cleanup = () => {
        ro.disconnect();
        window.removeEventListener("pointermove", onPointer);
        document.removeEventListener("visibilitychange", onVis);
        scene.dispose();
        sceneRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="scene-poster absolute inset-0" />
      <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`} />
      <div className="scene-vignette pointer-events-none absolute inset-0" />
    </div>
  );
}
