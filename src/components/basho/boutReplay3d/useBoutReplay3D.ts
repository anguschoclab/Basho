/**
 * useBoutReplay3D.ts
 * ==================
 * 3D bout replay hook — a thin wrapper over `useReplayClock` that supplies
 * a detached 2D canvas (the tick's context check requires one) and a no-op
 * drawFrame; the three.js renderer reads `refs` directly each frame.
 */

import { useRef } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { ReplayPhase } from "@/components/basho/boutReplay/boutCanvas";
import type { PbpLine } from "@/presenters/engineAccess";
import type { ReplayRefs } from "@/components/basho/boutReplay/replayRuntime";
import {
  useReplayClock,
  type BoutReplayProgress,
  type ReplaySpeed,
} from "@/components/basho/boutReplay/useReplayClock";

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

/** Module-stable draw factory — the 3D renderer reads refs every frame. */
const makeNoopDrawFrame = () => () => {};

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

  const clock = useReplayClock({
    result,
    eastRikishi,
    westRikishi,
    autoPlay,
    onComplete,
    onProgressUpdate,
    canvasRef,
    makeDrawFrame: makeNoopDrawFrame,
  });

  return {
    refs: clock.refs,
    isPlaying: clock.isPlaying,
    setIsPlaying: clock.setIsPlaying,
    speed: clock.speed,
    setSpeed: clock.setSpeed,
    uiPhase: clock.uiPhase,
    narIndex: clock.narIndex,
    pbpLines: clock.pbpLines,
    progress: clock.progress,
    seekTo: clock.seekTo,
    reset: clock.reset,
  };
}
