/**
 * src/components/game/boutReplay/useBoutReplay.ts
 * ================================================
 * Custom hook that owns all animation state, refs, and the RAF loop
 * for the BoutReplayViewer. Extracted from the BoutReplayViewer monolith
 * for separation of concerns and testability. The runtime helpers live
 * in replayFx/replayLoop/replayControls/replayRuntime.
 */

import { useState, useMemo, useCallback } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getReplayPhaseDurations, buildBoutScript } from "@/presenters/engineAccess";
import type { BoutScript } from "@/presenters/engineAccess";
import { SeededRNG } from "@/presenters/engineAccess";
import { getNarrationLines, type ReplayPhase } from "./boutCanvas";
import { makeSpawnParticles, drawReplayFrame } from "./replayFx";
import { replayReset, replayUpdateProgress, replaySeekTo } from "./replayControls";
import {
  useReplayCanvas,
  useReplayRefs,
  useReplayLoop,
  buildReplayRuntime,
  buildReplayControls,
} from "./replayRuntime";

export interface BoutReplayProgress {
  phaseIndex: number;
  phaseProgress: number;
  globalProgress: number;
  totalDurationMs: number;
  elapsedMs: number;
}

export type ReplaySpeed = 0.5 | 1 | 2;

export interface UseBoutReplayReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: ReplaySpeed;
  setSpeed: (s: ReplaySpeed) => void;
  uiPhase: ReplayPhase;
  narration: string;
  progress: BoutReplayProgress;
  seekTo: (globalProgress: number) => void;
  reset: () => void;
}

export function useBoutReplay(
  result: BoutResult,
  eastRikishi: UIRikishi,
  westRikishi: UIRikishi,
  autoPlay: boolean,
  onComplete?: () => void,
  onProgressUpdate?: (progress: BoutReplayProgress) => void
): UseBoutReplayReturn {
  const canvasRef = useReplayCanvas();

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [uiPhase, setUiPhase] = useState<ReplayPhase>("ritual");
  const [narration, setNarration] = useState("");
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
  const lines = useMemo(
    () => getNarrationLines(result, eastRikishi, westRikishi),
    [result, eastRikishi, westRikishi]
  );

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
    [canvasRef, refs, rng, result, winnerSide, boutScript, eastRikishi, westRikishi, lines, spawnParticles]
  );

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number) => drawReplayFrame(rt, ctx, W, H),
    [rt]
  );

  const setters = useMemo(
    () => ({ setProgress, setUiPhase, setNarration, setIsPlaying }),
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

  useReplayLoop(isPlaying, rt, refs, phaseDurations, setters, onComplete, drawFrame, updateProgress);

  return {
    canvasRef,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    uiPhase,
    narration,
    progress,
    seekTo,
    reset,
  };
}
