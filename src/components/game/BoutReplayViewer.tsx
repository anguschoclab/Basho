// BoutReplayViewer.tsx — 2D bout visualizer (composition root)
// Canvas rendering, animation state, and controls are in boutReplay/.

import { forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { PHASE_LABELS, CROWD_TEXT } from "./boutReplay/boutCanvas";
import { useBoutReplay } from "./boutReplay/useBoutReplay";
import type { BoutReplayProgress } from "./boutReplay/useBoutReplay";
import { BoutControls } from "./boutReplay/BoutControls";
import { GlossaryTip } from "@/components/ui/GlossaryTip";

export interface BoutReplayViewerHandle {
  seekTo: (progress: number) => void;
}

interface BoutReplayViewerProps {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  className?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: BoutReplayProgress) => void;
}

export const BoutReplayViewer = forwardRef<BoutReplayViewerHandle, BoutReplayViewerProps>(
  function BoutReplayViewer(
    { result, eastRikishi, westRikishi, className, autoPlay = false, onComplete, onProgressUpdate },
    ref
  ) {
    const {
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
    } = useBoutReplay(result, eastRikishi, westRikishi, autoPlay, onComplete, onProgressUpdate);

    useImperativeHandle(
      ref,
      () => ({
        seekTo,
      }),
      [seekTo]
    );

    const label = PHASE_LABELS[uiPhase];

    return (
      <div
        className={cn(
          "rounded-lg overflow-hidden border border-border bg-card flex flex-col",
          className
        )}
      >
        {/* Header: fighters */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-west" />
            <span className="font-semibold">{eastRikishi.shikona}</span>
            <span className="text-muted-foreground text-xs">{eastRikishi.rankLabel}</span>
          </div>
          <span className="text-muted-foreground font-medium tracking-widest text-xs">VS</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{westRikishi.rankLabel}</span>
            <span className="font-semibold">{westRikishi.shikona}</span>
            <span
              aria-hidden="true"
              className="inline-block w-2.5 h-2.5 rounded-full bg-destructive"
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="relative bg-black">
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className="w-full block"
            style={{ aspectRatio: "8/5" }}
          />

          {/* Phase badge overlay */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1 border border-white/10">
              <span className="text-white/50 text-xs font-medium">{label.ja}</span>
              <span className="text-white/20 text-xs">·</span>
              {uiPhase === "tachiai" ? (
                <GlossaryTip termId="tachiai">
                  <span className="text-white text-xs font-semibold tracking-wider uppercase">
                    {label.en}
                  </span>
                </GlossaryTip>
              ) : (
                <span className="text-white text-xs font-semibold tracking-wider uppercase">
                  {label.en}
                </span>
              )}
            </div>
          </div>

          {/* Kensho envelopes */}
          {result.kenshoEnvelopes > 0 && (uiPhase === "finish" || uiPhase === "ceremony") && (
            <div className="absolute top-3 right-3 pointer-events-none">
              <div className="flex items-center gap-1 bg-gold/20 rounded px-2 py-1 border border-gold/40">
                <span className="text-gold text-xs">¥</span>
                <span className="text-gold text-xs font-semibold">
                  {result.kenshoEnvelopes} kensho
                </span>
              </div>
            </div>
          )}

          {/* Crowd text */}
          {uiPhase !== "complete" && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <span
                className={cn(
                  "text-xs font-medium transition-opacity duration-500 px-2 py-0.5 rounded-full",
                  uiPhase === "tachiai" || uiPhase === "finish" || uiPhase === "ceremony"
                    ? "text-gold bg-black/50"
                    : "text-white/50"
                )}
              >
                {CROWD_TEXT[uiPhase]}
              </span>
            </div>
          )}
        </div>

        {/* Narration */}
        <div className="px-4 py-3 bg-muted/20 border-t border-border min-h-[3.5rem] flex items-center justify-center">
          <p className="text-sm text-center leading-snug text-foreground/90 italic">
            {narration || "…"}
          </p>
        </div>

        <BoutControls
          isPlaying={isPlaying}
          speed={speed}
          progress={progress.globalProgress}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onRestart={reset}
          onSpeedChange={setSpeed}
          onSeek={seekTo}
        />
      </div>
    );
  }
);
