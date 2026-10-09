/**
 * replayControls.ts
 *
 * Playback controls for the bout replay: reset, seek, and the throttled
 * progress reporter shared by the RAF loop and seek.
 */

import {
  PHASES,
  getPhaseNarrationIndex,
  seekToPhase,
  computeGlobalProgress,
  type ReplayPhase,
  type RikishiState,
  type Particle,
} from "./boutCanvas";
import type { BoutReplayProgress } from "./useBoutReplay";

/** Refs + setters the controls need. */
export interface ReplayControlsCtx {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  phaseRef: React.MutableRefObject<ReplayPhase>;
  progressRef: React.MutableRefObject<number>;
  flashRef: React.MutableRefObject<number>;
  shakeRef: React.MutableRefObject<{ x: number; y: number }>;
  particlesRef: React.MutableRefObject<Particle[]>;
  narIndexRef: React.MutableRefObject<number>;
  boutProgressRef: React.MutableRefObject<BoutReplayProgress>;
  lastProgressUpdateRef: React.MutableRefObject<number>;
  onProgressUpdateRef: React.MutableRefObject<((p: BoutReplayProgress) => void) | undefined>;
  eastRef: React.MutableRefObject<RikishiState>;
  phaseDurationsArr: number[];
  lines: string[];
  setProgress: (p: BoutReplayProgress) => void;
  setUiPhase: (p: ReplayPhase) => void;
  setNarration: (s: string) => void;
  setIsPlaying: (playing: boolean) => void;
}

/** Reset playback to the ritual phase with narration restarted. */
export function replayReset(ctx: ReplayControlsCtx): void {
  ctx.phaseRef.current = "ritual";
  ctx.progressRef.current = 0;
  ctx.flashRef.current = 0;
  ctx.shakeRef.current = { x: 0, y: 0 };
  ctx.particlesRef.current = [];
  ctx.narIndexRef.current = -1;
  const zeroProgress: BoutReplayProgress = {
    phaseIndex: 0,
    phaseProgress: 0,
    globalProgress: 0,
    totalDurationMs: ctx.boutProgressRef.current.totalDurationMs,
    elapsedMs: 0,
  };
  ctx.boutProgressRef.current = zeroProgress;
  ctx.setProgress(zeroProgress);
  ctx.setUiPhase("ritual");
  ctx.setNarration(ctx.lines[0] || "");
  ctx.setIsPlaying(false);
}

/** Recompute + throttle-publish the progress snapshot. */
export function replayUpdateProgress(ctx: ReplayControlsCtx): void {
  const phaseIdx = PHASES.indexOf(ctx.phaseRef.current);
  const computed = computeGlobalProgress(phaseIdx, ctx.progressRef.current, ctx.phaseDurationsArr);
  const newProgress: BoutReplayProgress = {
    phaseIndex: phaseIdx,
    phaseProgress: ctx.progressRef.current,
    ...computed,
  };
  ctx.boutProgressRef.current = newProgress;

  const now = performance.now();
  if (now - ctx.lastProgressUpdateRef.current >= 100) {
    ctx.lastProgressUpdateRef.current = now;
    ctx.setProgress(newProgress);
    ctx.onProgressUpdateRef.current?.(newProgress);
  }
}

/** Seek to a global 0..1 progress position and redraw. */
export function replaySeekTo(
  ctx: ReplayControlsCtx,
  globalProgress: number,
  drawFrame: (c: CanvasRenderingContext2D, W: number, H: number) => void
): void {
  const target = seekToPhase(globalProgress, ctx.phaseDurationsArr);
  const newPhase = PHASES[target.phaseIndex] || "ritual";
  ctx.phaseRef.current = newPhase;
  ctx.progressRef.current = target.phaseProgress;
  ctx.setUiPhase(newPhase);

  const ni = getPhaseNarrationIndex(newPhase, target.phaseProgress, ctx.lines.length);
  ctx.narIndexRef.current = ni;
  ctx.setNarration(ctx.lines[ni] || "");

  const computed = computeGlobalProgress(
    target.phaseIndex,
    target.phaseProgress,
    ctx.phaseDurationsArr
  );
  const newProgress: BoutReplayProgress = {
    phaseIndex: target.phaseIndex,
    phaseProgress: target.phaseProgress,
    ...computed,
  };
  ctx.boutProgressRef.current = newProgress;
  ctx.lastProgressUpdateRef.current = performance.now();
  ctx.setProgress(newProgress);
  ctx.onProgressUpdateRef.current?.(newProgress);

  const canvas = ctx.canvasRef.current;
  if (canvas) {
    const c = canvas.getContext("2d");
    if (c) drawFrame(c, 800, 500);
  }
}
