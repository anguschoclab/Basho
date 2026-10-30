// BoutReplayViewer.tsx — 2D bout visualizer (composition root)
// Canvas rendering, animation state, and controls are in boutReplay/.
// A 3D presentation (three.js) lives in boutReplay3d/ behind a view toggle.

import { useImperativeHandle, useState } from "react";
import type { Ref } from "react";
import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { useBoutReplay } from "@/components/basho/boutReplay/useBoutReplay";
import type { BoutReplayProgress } from "@/components/basho/boutReplay/useBoutReplay";
import { BoutControls } from "@/components/basho/boutReplay/BoutControls";
import { NarrationFeed } from "@/components/basho/boutReplay/NarrationFeed";
import { BoutReplay3D } from "@/components/basho/boutReplay3d/BoutReplay3D";
import { ReplayHeader, ReplayOverlays } from "@/components/basho/boutReplay/ReplayChrome";

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

export function BoutReplayViewer({
  result,
  eastRikishi,
  westRikishi,
  className,
  autoPlay = false,
  onComplete,
  onProgressUpdate,
  ref,
}: BoutReplayViewerProps & { ref?: Ref<BoutReplayViewerHandle> }) {
  const {
    canvasRef,
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
  } = useBoutReplay(result, eastRikishi, westRikishi, autoPlay, onComplete, onProgressUpdate);

  useImperativeHandle(
    ref,
    () => ({
      seekTo,
    }),
    [seekTo]
  );

  const [view, setView] = useState<"2d" | "3d">("2d");

  const viewToggle = (
    <button
      type="button"
      onClick={() => setView((v) => (v === "2d" ? "3d" : "2d"))}
      className="pointer-events-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-on-scrim/20 text-on-scrim/70 hover:text-on-scrim hover:border-on-scrim/40 bg-scrim/60"
      title="Switch replay presentation"
    >
      {view === "2d" ? "3D" : "2D"}
    </button>
  );

  if (view === "3d") {
    return (
      <div className={cn("relative", className)}>
        <BoutReplay3D
          result={result}
          eastRikishi={eastRikishi}
          westRikishi={westRikishi}
          autoPlay={autoPlay}
          onComplete={onComplete}
          onProgressUpdate={onProgressUpdate}
        />
        <div className="absolute top-[52px] right-3 z-10">{viewToggle}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border border-border bg-card flex flex-col",
        className
      )}
    >
      {/* Header: fighters */}
      <ReplayHeader eastRikishi={eastRikishi} westRikishi={westRikishi} />

      {/* Canvas */}
      <div className="relative bg-scrim">
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          className="w-full block"
          style={{ aspectRatio: "8/5" }}
        />

        <ReplayOverlays
          uiPhase={uiPhase}
          result={result}
          extra={<div className="absolute bottom-3 right-3">{viewToggle}</div>}
        />
      </div>

      {/* Broadcast narration feed */}
      <div className="bg-scrim/95 border-t border-border">
        <NarrationFeed lines={pbpLines} activeIndex={narIndex} />
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
