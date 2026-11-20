/**
 * useReplayClock.ts
 * ==================
 * Shared replay clock for both bout replay viewers — the 2D canvas viewer
 * (`useBoutReplay`) and the three.js 3D viewer (`useBoutReplay3D`). Owns all
 * animation state, refs, narration bookkeeping, and the RAF loop; callers
 * differ only in the canvas they supply and the per-frame draw callback
 * (the 3D renderer reads `refs` directly and draws nothing).
 */

import { useState, useMemo, useCallback } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getReplayPhaseDurations, buildBoutScript } from "@/presenters/engineAccess";
import type { BoutScript } from "@/presenters/engineAccess";
import { SeededRNG } from "@/presenters/engineAccess";
import type { ReplayPhase } from "@/components/basho/boutReplay/boutCanvas";
import { getNarrationPbp } from "@/components/basho/boutReplay/feedModel";
import type { PbpLine } from "@/presenters/engineAccess";
import { makeSpawnParticles, type ReplayRuntime } from "@/components/basho/boutReplay/replayFx";
import {
  replayReset,
  replayUpdateProgress,
  replaySeekTo,
} from "@/components/basho/boutReplay/replayControls";
import {
  useReplayRefs,
  useReplayLoop,
  buildReplayRuntime,
  buildReplayControls,
  type ReplayRefs,
} from "@/components/basho/boutReplay/replayRuntime";

export interface BoutReplayProgress {
  phaseIndex: number;
  phaseProgress: number;
  globalProgress: number;
  totalDurationMs: number;
  elapsedMs: number;
}

export type ReplaySpeed = 0.5 | 1 | 2;

/** Per-frame canvas draw call produced from the replay runtime. */
export type DrawFrameFactory = (
  rt: ReplayRuntime
) => (ctx: CanvasRenderingContext2D, W: number, H: number) => void;

export interface UseReplayClockArgs {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  autoPlay: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: BoutReplayProgress) => void;
  /** Canvas the tick draws into (may be detached for the 3D path). */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Factory for the per-frame draw call — no-op for the 3D renderer. */
  makeDrawFrame: DrawFrameFactory;
}

export interface UseReplayClockReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  refs: ReplayRefs;
  rt: ReplayRuntime;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: ReplaySpeed;
  setSpeed: (s: ReplaySpeed) => void;
  uiPhase: ReplayPhase;
  narration: string;
  /** Index into `pbpLines` of the currently-spoken narration line. */
  narIndex: number;
  /** Structured narration lines (phase/tags/voice preserved). */
  pbpLines: PbpLine[];
  progress: BoutReplayProgress;
  seekTo: (globalProgress: number) => void;
  reset: () => void;
}

export function useReplayClock({
  result,
  eastRikishi,
  westRikishi,
  autoPlay,
  onComplete,
  onProgressUpdate,
  canvasRef,
  makeDrawFrame,
}: UseReplayClockArgs): UseReplayClockReturn {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [uiPhase, setUiPhase] = useState<ReplayPhase>("ritual");
  const [narration, setNarration] = useState("");
  const [narIndex, setNarIndex] = useState(0);
  const [progress, setProgress] = useState<BoutReplayProgress>({
    phaseIndex: 0,
    phaseProgress: 0,
    globalProgress: 0,
    totalDurationMs: 0,
    elapsedMs: 0,
  });

  const refs = useReplayRefs(speed, isPlaying, onProgressUpdate);

  const winnerSide = result.winnerRikishiId === eastRikishi.id ? "east" : "west";
  const boutScript = useMemo<BoutScript>(() => buildBoutScript(result), [result]);
  const phaseDurations = useMemo(
    () => getReplayPhaseDurations(result, boutScript),
    [result, boutScript]
  );
  const rng = useMemo(() => new SeededRNG(result.boutId || "seed"), [result.boutId]);
  const pbpLines = useMemo(
    () => getNarrationPbp(result, eastRikishi, westRikishi),
    [result, eastRikishi, westRikishi]
  );
  // String view kept for the legacy single-line narration path; indices are
  // identical because pbpLines is the single source of truth.
  const lines = useMemo(() => pbpLines.map((l) => l.text), [pbpLines]);

  const spawnParticles = useMemo(
    () => makeSpawnParticles(refs.particlesRef, refs.particleId, rng),
    [rng, refs]
  );

  const rt = useMemo(
    () =>
      buildReplayRuntime(canvasRef, refs, {
        rng,
        result,
        winnerSide,
        boutScript,
        eastRikishi,
        westRikishi,
        lines,
        spawnParticles,
      }),
    [
      canvasRef,
      refs,
      rng,
      result,
      winnerSide,
      boutScript,
      eastRikishi,
      westRikishi,
      lines,
      spawnParticles,
    ]
  );

  const drawFrame = useMemo(() => makeDrawFrame(rt), [makeDrawFrame, rt]);

  const setters = useMemo(
    () => ({ setProgress, setUiPhase, setNarration, setNarIndex, setIsPlaying }),
    []
  );

  const controlsCtx = useMemo(
    () => buildReplayControls(canvasRef, refs, phaseDurations, lines, setters),
    [canvasRef, refs, phaseDurations, lines, setters]
  );

  const reset = useCallback(() => replayReset(controlsCtx), [controlsCtx]);
  const updateProgress = useCallback(() => replayUpdateProgress(controlsCtx), [controlsCtx]);
  const seekTo = useCallback(
    (globalProgress: number) => replaySeekTo(controlsCtx, globalProgress, drawFrame),
    [controlsCtx, drawFrame]
  );

  useReplayLoop(
    isPlaying,
    rt,
    refs,
    phaseDurations,
    setters,
    onComplete,
    drawFrame,
    updateProgress
  );

  return {
    canvasRef,
    refs,
    rt,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    uiPhase,
    narration,
    narIndex,
    pbpLines,
    progress,
    seekTo,
    reset,
  };
}
