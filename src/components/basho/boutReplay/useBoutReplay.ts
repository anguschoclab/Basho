/**
 * useBoutReplay.ts
 * ================================================
 * 2D-canvas bout replay hook — a thin wrapper over `useReplayClock` that
 * supplies the DOM canvas (`useReplayCanvas`) and the real canvas draw
 * (`drawReplayFrame`).
 */

import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { ReplayPhase } from "@/components/basho/boutReplay/boutCanvas";
import type { PbpLine } from "@/presenters/engineAccess";
import { drawReplayFrame, type ReplayRuntime } from "@/components/basho/boutReplay/replayFx";
import { useReplayCanvas } from "@/components/basho/boutReplay/replayRuntime";
import {
  useReplayClock,
  type BoutReplayProgress,
  type ReplaySpeed,
} from "@/components/basho/boutReplay/useReplayClock";

export type { BoutReplayProgress, ReplaySpeed };

/** Module-stable draw factory — draws the replay frame each tick. */
const makeCanvasDrawFrame =
  (rt: ReplayRuntime) =>
  (ctx: CanvasRenderingContext2D, W: number, H: number) =>
    drawReplayFrame(rt, ctx, W, H);

export interface UseBoutReplayReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
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

export function useBoutReplay(
  result: BoutResult,
  eastRikishi: UIRikishi,
  westRikishi: UIRikishi,
  autoPlay: boolean,
  onComplete?: () => void,
  onProgressUpdate?: (progress: BoutReplayProgress) => void
): UseBoutReplayReturn {
  const canvasRef = useReplayCanvas();
  const clock = useReplayClock({
    result,
    eastRikishi,
    westRikishi,
    autoPlay,
    onComplete,
    onProgressUpdate,
    canvasRef,
    makeDrawFrame: makeCanvasDrawFrame,
  });
  return {
    canvasRef: clock.canvasRef,
    isPlaying: clock.isPlaying,
    setIsPlaying: clock.setIsPlaying,
    speed: clock.speed,
    setSpeed: clock.setSpeed,
    uiPhase: clock.uiPhase,
    narration: clock.narration,
    narIndex: clock.narIndex,
    pbpLines: clock.pbpLines,
    progress: clock.progress,
    seekTo: clock.seekTo,
    reset: clock.reset,
  };
}
