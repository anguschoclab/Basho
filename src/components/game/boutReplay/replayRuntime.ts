/**
 * replayRuntime.ts
 *
 * Setup hooks for useBoutReplay: canvas HiDPI init, the animation ref
 * bag, runtime/control context assembly, and the RAF + static-draw
 * effects.
 */

import { useEffect, useRef, useMemo, type MutableRefObject } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutScript, SeededRNG } from "@/presenters/engineAccess";
import { PHASES, type ReplayPhase, type RikishiState, type Particle } from "./boutCanvas";
import type { ReplayRuntime } from "./replayFx";
import type { ReplayTickCtx } from "./replayLoop";
import { replayTick } from "./replayLoop";
import type { ReplayControlsCtx } from "./replayControls";
import type { BoutReplayProgress, ReplaySpeed } from "./useBoutReplay";

/** Ref bag for animation state (no re-render needed for canvas). */
export interface ReplayRefs {
  animRef: MutableRefObject<number | null>;
  isPlayingRef: MutableRefObject<boolean>;
  speedRef: MutableRefObject<number>;
  phaseRef: MutableRefObject<ReplayPhase>;
  progressRef: MutableRefObject<number>;
  eastRef: MutableRefObject<RikishiState>;
  westRef: MutableRefObject<RikishiState>;
  particlesRef: MutableRefObject<Particle[]>;
  particleId: MutableRefObject<number>;
  flashRef: MutableRefObject<number>;
  shakeRef: MutableRefObject<{ x: number; y: number }>;
  lastTimeRef: MutableRefObject<number>;
  narIndexRef: MutableRefObject<number>;
  boutProgressRef: MutableRefObject<BoutReplayProgress>;
  lastProgressUpdateRef: MutableRefObject<number>;
  onProgressUpdateRef: MutableRefObject<((p: BoutReplayProgress) => void) | undefined>;
}

/** HiDPI canvas setup — CSS-pixel draw space (800/500). */
export function useReplayCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    const CSS_W = 800;
    const CSS_H = 500;
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    canvas.style.width = `${CSS_W}px`;
    canvas.style.height = `${CSS_H}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);
  return canvasRef;
}

/** All animation refs + their sync effects. */
export function useReplayRefs(
  speed: ReplaySpeed,
  isPlaying: boolean,
  onProgressUpdate?: (progress: BoutReplayProgress) => void
): ReplayRefs {
  const animRef = useRef<number | null>(null);
  const phaseRef = useRef<ReplayPhase>("ritual");
  const progressRef = useRef(0);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  const eastRef = useRef<RikishiState>({
    pos: { x: 0.27, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const westRef = useRef<RikishiState>({
    pos: { x: 0.73, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const particlesRef = useRef<Particle[]>([]);
  const particleId = useRef(0);
  const flashRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const narIndexRef = useRef(-1);
  const boutProgressRef = useRef<BoutReplayProgress>({
    phaseIndex: 0,
    phaseProgress: 0,
    globalProgress: 0,
    totalDurationMs: 0,
    elapsedMs: 0,
  });
  const lastProgressUpdateRef = useRef(0);
  const onProgressUpdateRef = useRef(onProgressUpdate);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Stable bag identity — refs never change, so downstream memoized
  // contexts (runtime/controls) and the RAF effect don't churn.
  return useMemo(
    () => ({
      animRef,
      isPlayingRef,
      speedRef,
      phaseRef,
      progressRef,
      eastRef,
      westRef,
      particlesRef,
      particleId,
      flashRef,
      shakeRef,
      lastTimeRef,
      narIndexRef,
      boutProgressRef,
      lastProgressUpdateRef,
      onProgressUpdateRef,
    }),
    []
  );
}

/** Assemble the shared runtime bag consumed by fx/loop helpers. */
export function buildReplayRuntime(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  refs: ReplayRefs,
  params: {
    rng: SeededRNG;
    result: BoutResult;
    winnerSide: "east" | "west";
    boutScript: BoutScript;
    eastRikishi: UIRikishi;
    westRikishi: UIRikishi;
    lines: string[];
    spawnParticles: ReplayRuntime["spawnParticles"];
  }
): ReplayRuntime {
  return { canvasRef, ...refs, ...params };
}

/** Assemble the controls context consumed by the control helpers. */
export function buildReplayControls(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  refs: ReplayRefs,
  phaseDurations: Record<ReplayPhase, number>,
  lines: string[],
  setters: {
    setProgress: (p: BoutReplayProgress) => void;
    setUiPhase: (p: ReplayPhase) => void;
    setNarration: (s: string) => void;
    setIsPlaying: (playing: boolean) => void;
  }
): ReplayControlsCtx {
  return {
    canvasRef,
    phaseRef: refs.phaseRef,
    progressRef: refs.progressRef,
    flashRef: refs.flashRef,
    shakeRef: refs.shakeRef,
    particlesRef: refs.particlesRef,
    narIndexRef: refs.narIndexRef,
    boutProgressRef: refs.boutProgressRef,
    lastProgressUpdateRef: refs.lastProgressUpdateRef,
    onProgressUpdateRef: refs.onProgressUpdateRef,
    eastRef: refs.eastRef,
    phaseDurationsArr: PHASES.map((p) => phaseDurations[p] || 0),
    lines,
    ...setters,
  };
}

/** RAF loop + paused static-draw effects. */
export function useReplayLoop(
  isPlaying: boolean,
  rt: ReplayRuntime,
  refs: ReplayRefs,
  phaseDurations: Record<ReplayPhase, number>,
  setters: {
    setUiPhase: (p: ReplayPhase) => void;
    setNarration: (s: string) => void;
    setIsPlaying: (playing: boolean) => void;
  },
  onComplete: (() => void) | undefined,
  drawFrame: (ctx: CanvasRenderingContext2D, W: number, H: number) => void,
  updateProgress: () => void
) {
  const { animRef, isPlayingRef, lastTimeRef } = refs;
  // ── Main RAF loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = 0;

    const ctx: ReplayTickCtx = {
      ...rt,
      phaseDurations,
      ...setters,
      onComplete,
    };

    const loop = (timestamp: number) => {
      if (!isPlayingRef.current) return;
      replayTick(ctx, timestamp, drawFrame, updateProgress);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, rt, phaseDurations, setters, onComplete, drawFrame, updateProgress, animRef, isPlayingRef, lastTimeRef]);

  // Static draw when paused
  useEffect(() => {
    if (isPlaying) return;
    const canvas = rt.canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFrame(ctx, 800, 500);
  }, [isPlaying, rt, drawFrame]);
}
