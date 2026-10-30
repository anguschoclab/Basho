// BoutReplay3D.tsx — 3D bout visualizer (out-of-scope parity item)
// Same replay clock as the 2D canvas; a three.js scene renders the refs.

import { useEffect, useRef } from "react";
import type { Ref } from "react";
import { useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutReplayProgress } from "@/components/basho/boutReplay/useBoutReplay";
import { BoutControls } from "@/components/basho/boutReplay/BoutControls";
import { NarrationFeed } from "@/components/basho/boutReplay/NarrationFeed";
import { ReplayHeader, ReplayOverlays } from "@/components/basho/boutReplay/ReplayChrome";
import { useBoutReplay3D } from "@/components/basho/boutReplay3d/useBoutReplay3D";
import { createBoutScene, type BoutScene3D } from "@/components/basho/boutReplay3d/scene3d";

export interface BoutReplay3DHandle {
  seekTo: (progress: number) => void;
}

interface BoutReplay3DProps {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  className?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: BoutReplayProgress) => void;
}

export function BoutReplay3D({
  result,
  eastRikishi,
  westRikishi,
  className,
  autoPlay = false,
  onComplete,
  onProgressUpdate,
  ref,
}: BoutReplay3DProps & { ref?: Ref<BoutReplay3DHandle> }) {
  const {
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
  } = useBoutReplay3D(result, eastRikishi, westRikishi, autoPlay, onComplete, onProgressUpdate);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoutScene3D | null>(null);

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  // Mount the WebGL canvas + own render RAF reading the shared sim refs.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = createBoutScene(800, 500);
    sceneRef.current = scene;
    mount.appendChild(scene.canvas);

    let raf = 0;
    const loop = (t: number) => {
      scene.apply(
        refs.eastRef.current,
        refs.westRef.current,
        refs.particlesRef.current,
        refs.flashRef.current,
        refs.shakeRef.current,
        refs.phaseRef.current,
        t
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      scene.dispose();
      mount.removeChild(scene.canvas);
      sceneRef.current = null;
    };
  }, [refs]);

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border border-border bg-card flex flex-col",
        className
      )}
    >
      {/* Header: fighters */}
      <ReplayHeader eastRikishi={eastRikishi} westRikishi={westRikishi} />

      {/* 3D canvas */}
      <div className="relative bg-scrim">
        <div ref={mountRef} className="w-full block" />
        <ReplayOverlays uiPhase={uiPhase} result={result} />
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
