/**
 * useBoutReplay3D.ts
 * ==================
 * Simulation hook for the 3D bout replay. Identical replay clock to
 * useBoutReplay — same RAF tick, same RikishiState refs — but draws to a
 * detached 2D canvas (the tick's context check requires one) with a no-op
 * drawFrame. The three.js renderer reads the refs directly each frame.
 */

import { useRef, useState, useMemo, useCallback } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getReplayPhaseDurations, buildBoutScript } from "@/presenters/engineAccess";
import type { BoutScript } from "@/presenters/engineAccess";
import { SeededRNG } from "@/presenters/engineAccess";
import type { ReplayPhase } from "@/components/basho/boutReplay/boutCanvas";
import { getNarrationPbp } from "@/components/basho/boutReplay/feedModel";
import type { PbpLine } from "@/presenters/engineAccess";
import { makeSpawnParticles } from "@/components/basho/boutReplay/replayFx";
import { replayReset, replayUpdateProgress, replaySeekTo } from "@/components/basho/boutReplay/replayControls";
import {
  useReplayRefs,
  useReplayLoop,
  buildReplayRuntime,
  buildReplayControls,
  type ReplayRefs,
} from "@/components/basho/boutReplay/replayRuntime";
import type { BoutReplayProgress, ReplaySpeed } from "@/components/basho/boutReplay/useBoutReplay";

export interface UseBoutReplay3DReturn {
  refs: ReplayRefs;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: ReplaySpeed;
  setSpeed: (s: ReplaySpeed) => void;
  uiPhase: ReplayPhase;
  narIndex: number;
  pbpLines: PbpLine[];
  progress: BoutReplayProgress;
  seekTo: (globalProgress: number) => void;
  reset: () => void;
}

export function useBoutReplay3D(
  result: BoutResult,
  eastRikishi: UIRikishi,
  westRikishi: UIRikishi,
  autoPlay: boolean,
  onComplete?: () => void,
  onProgressUpdate?: (progress: BoutReplayProgress) => void
): UseBoutReplay3DReturn {
  // Detached 2D canvas — replayTick requires a getContext("2d") call to succeed.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  if (canvasRef.current === null && typeof document !== "undefined") {
    canvasRef.current = document.createElement("canvas");
    canvasRef.current.width = 800;
    canvasRef.current.height = 500;
  }

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [uiPhase, setUiPhase] = useState<ReplayPhase>("ritual");
  const [, setNarration] = useState("");
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

  // The 3D renderer reads refs every frame — the tick's draw call is a no-op.
  const drawFrame = useCallback((_ctx: CanvasRenderingContext2D, _W: number, _H: number) => {}, []);

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

  useReplayLoop(isPlaying, rt, refs, phaseDurations, setters, onComplete, drawFrame, updateProgress);

  return {
    refs,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    uiPhase,
    narIndex,
    pbpLines,
    progress,
    seekTo,
    reset,
  };
}
