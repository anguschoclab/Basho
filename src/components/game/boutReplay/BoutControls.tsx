/**
 * src/components/game/boutReplay/BoutControls.tsx
 * ================================================
 * Playback controls bar for the BoutReplayViewer.
 */

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { ReplaySpeed } from "./useBoutReplay";

interface BoutControlsProps {
  isPlaying: boolean;
  speed: ReplaySpeed;
  progress: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onSpeedChange: (s: ReplaySpeed) => void;
  onSeek: (progress: number) => void;
}

export function BoutControls({
  isPlaying,
  speed,
  progress,
  onPlayPause,
  onRestart,
  onSpeedChange,
  onSeek,
}: BoutControlsProps) {
  return (
    <div className="px-4 py-2.5 border-t border-border flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onPlayPause}
        aria-label={isPlaying ? "Pause" : "Play"}
        tooltip={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onRestart}
        aria-label="Restart replay"
        tooltip="Restart replay"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => onSeek(Number(e.target.value) / 1000)}
        className="flex-1 h-1.5 accent-primary cursor-pointer"
        aria-label="Seek replay progress"
      />

      <div className="flex items-center gap-1 shrink-0">
        {([0.5, 1, 2] as const).map((s) => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => onSpeedChange(s)}
            className={cn(
              "text-xs px-2 py-0.5 rounded font-mono transition-colors",
              speed === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={`Set speed to ${s}x`}
            tooltip={`Set speed to ${s}x`}
          >
            {s}×
          </Button>
        ))}
      </div>
    </div>
  );
}
