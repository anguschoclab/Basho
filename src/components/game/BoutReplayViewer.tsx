// BoutReplayViewer.tsx
// Bout Replay Viewer - Animated visual replay of bout with graphics
// Per Constitution: Renders combat facts visually with dohyo, rikishi positions, kimarite finish

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { BoutResult, Rikishi } from "@/engine/types";
import { Play, Pause, RotateCcw, SkipForward, Volume2, VolumeX } from "lucide-react";

interface BoutReplayViewerProps {
  result: BoutResult;
  eastRikishi: Rikishi;
  westRikishi: Rikishi;
  className?: string;
  autoPlay?: boolean;
  onComplete?: () => void;
}

type ReplayPhase = "ritual" | "tachiai" | "clinch" | "momentum" | "finish" | "ceremony" | "complete";

interface RikishiPosition {
  x: number; // -50 to 50 (center is 0)
  y: number; // -50 to 50 (center is 0)
  rotation: number; // degrees
  scale: number;
  state: "standing" | "charging" | "grappling" | "pushing" | "falling" | "victory";
}

const PHASE_DURATIONS: Record<ReplayPhase, number> = {
  ritual: 3000,
  tachiai: 1500,
  clinch: 2000,
  momentum: 3000,
  finish: 2000,
  ceremony: 2000,
  complete: 0
};

const PHASES: ReplayPhase[] = ["ritual", "tachiai", "clinch", "momentum", "finish", "ceremony", "complete"];

export function BoutReplayViewer({
  result,
  eastRikishi,
  westRikishi,
  className,
  autoPlay = false,
  onComplete
}: BoutReplayViewerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<ReplayPhase>("ritual");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [eastPos, setEastPos] = useState<RikishiPosition>({
    x: -30,
    y: 0,
    rotation: 0,
    scale: 1,
    state: "standing"
  });
  const [westPos, setWestPos] = useState<RikishiPosition>({
    x: 30,
    y: 0,
    rotation: 180,
    scale: 1,
    state: "standing"
  });

  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Avoid stale closures by reading the "latest" values from refs inside RAF.
  const phaseRef = useRef<ReplayPhase>("ritual");
  const logIndexRef = useRef<number>(-1);
  const speedRef = useRef<number>(1);

  useEffect(() => {
    phaseRef.current = currentPhase;
  }, [currentPhase]);
  useEffect(() => {
    logIndexRef.current = currentLogIndex;
  }, [currentLogIndex]);
  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Result.log might be missing/undefined depending on earlier engine versions; never crash.
  const safeLog = useMemo(() => (Array.isArray((result as any)?.log) ? (result as any).log : []), [result]);

  const updatePositionsForPhase = useCallback(
    (phase: ReplayPhase) => {
      const winner = result.winner;

      switch (phase) {
        case "ritual":
          setEastPos({ x: -30, y: 0, rotation: 0, scale: 1, state: "standing" });
          setWestPos({ x: 30, y: 0, rotation: 180, scale: 1, state: "standing" });
          break;

        case "tachiai":
          setEastPos({ x: -10, y: 0, rotation: 0, scale: 1.1, state: "charging" });
          setWestPos({ x: 10, y: 0, rotation: 180, scale: 1.1, state: "charging" });
          break;

        case "clinch":
          setEastPos({ x: -5, y: 0, rotation: 5, scale: 1, state: "grappling" });
          setWestPos({ x: 5, y: 0, rotation: -175, scale: 1, state: "grappling" });
          break;

        case "momentum":
          if (winner === "east") {
            setEastPos({ x: 5, y: 0, rotation: 10, scale: 1.05, state: "pushing" });
            setWestPos({ x: 25, y: 0, rotation: -170, scale: 0.95, state: "grappling" });
          } else {
            setEastPos({ x: -25, y: 0, rotation: -10, scale: 0.95, state: "grappling" });
            setWestPos({ x: -5, y: 0, rotation: 190, scale: 1.05, state: "pushing" });
          }
          break;

        case "finish":
          if (winner === "east") {
            setEastPos({ x: 20, y: 0, rotation: 15, scale: 1.1, state: "victory" });
            setWestPos({ x: 40, y: 10, rotation: -120, scale: 0.8, state: "falling" });
          } else {
            setEastPos({ x: -40, y: 10, rotation: 60, scale: 0.8, state: "falling" });
            setWestPos({ x: -20, y: 0, rotation: 165, scale: 1.1, state: "victory" });
          }
          break;

        case "ceremony":
          if (winner === "east") {
            setEastPos({ x: 0, y: 0, rotation: 0, scale: 1.15, state: "victory" });
            setWestPos({ x: 35, y: 0, rotation: 180, scale: 0.9, state: "standing" });
          } else {
            setEastPos({ x: -35, y: 0, rotation: 0, scale: 0.9, state: "standing" });
            setWestPos({ x: 0, y: 0, rotation: 180, scale: 1.15, state: "victory" });
          }
          break;

        case "complete":
          // Keep whatever the ceremony set; UI shows "complete" state.
          break;
      }
    },
    [result.winner]
  );

  const updatePositionsDuringPhase = useCallback((phase: ReplayPhase, progress: number) => {
    const wobble = Math.sin(progress * 0.1) * 2;

    if (phase === "clinch" || phase === "momentum") {
      setEastPos((prev) => ({ ...prev, y: wobble }));
      setWestPos((prev) => ({ ...prev, y: -wobble }));
    }
  }, []);

  const advanceLogIndex = useCallback(
    (phase: ReplayPhase) => {
      const phaseToLogPhase: Record<ReplayPhase, string> = {
        ritual: "",
        tachiai: "tachiai",
        clinch: "clinch",
        momentum: "momentum",
        finish: "finish",
        ceremony: "",
        complete: ""
      };

      const targetPhase = phaseToLogPhase[phase];
      if (!targetPhase) return;

      const startFrom = logIndexRef.current;

      const nextIndex = safeLog.findIndex(
        (entry: any, i: number) => i > startFrom && entry?.phase === targetPhase
      );

      if (nextIndex >= 0) setCurrentLogIndex(nextIndex);
    },
    [safeLog]
  );

  // Derive narration safely
  const currentNarration =
    currentLogIndex >= 0 && currentLogIndex < safeLog.length
      ? (safeLog[currentLogIndex] as any)?.description ?? ""
      : getPhaseNarration(currentPhase, result, eastRikishi, westRikishi);

  // Animation loop (RAF)
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;

      const delta = (timestamp - lastTickRef.current) * speedRef.current;
      lastTickRef.current = timestamp;

      const phase = phaseRef.current;
      const phaseDuration = PHASE_DURATIONS[phase] ?? 0;

      setPhaseProgress((prev) => {
        if (phaseDuration === 0) return 0;

        const next = prev + (delta / phaseDuration) * 100;
        const clamped = Math.min(100, next);

        // Use the computed "clamped" progress (not stale state)
        updatePositionsDuringPhase(phase, clamped);

        if (clamped >= 100) {
          const idx = PHASES.indexOf(phase);
          const nextPhase = PHASES[idx + 1];

          if (nextPhase) {
            setCurrentPhase(nextPhase);
            updatePositionsForPhase(nextPhase);
            advanceLogIndex(nextPhase);
            return 0;
          } else {
            setIsPlaying(false);
            onComplete?.();
            return 100;
          }
        }

        return clamped;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [isPlaying, updatePositionsDuringPhase, updatePositionsForPhase, advanceLogIndex, onComplete]);

  // Ensure correct initial pose when autoplay starts or result changes
  useEffect(() => {
    updatePositionsForPhase(currentPhase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.winner]);

  const handlePlayPause = () => {
    setIsPlaying((p) => !p);
    lastTickRef.current = 0;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhase("ritual");
    setPhaseProgress(0);
    setCurrentLogIndex(-1);
    updatePositionsForPhase("ritual");
    lastTickRef.current = 0;
  };

  const handleSkipToEnd = () => {
    setCurrentPhase("complete");
    setPhaseProgress(100);
    setIsPlaying(false);

    // show ceremony pose as final frame
    updatePositionsForPhase("ceremony");

    setCurrentLogIndex(safeLog.length > 0 ? safeLog.length - 1 : -1);
    onComplete?.();
  };

  const winnerName = result.winner === "east" ? eastRikishi.shikona : westRikishi.shikona;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bout Replay</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {currentPhase}
            </Badge>
            {currentPhase === "complete" && (
              <Badge variant="default">{winnerName} wins by {result.kimariteName}</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dohyo Visualization */}
        <div className="relative aspect-square max-w-md mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full border-4 border-amber-600 dark:border-amber-700 overflow-hidden">
          {/* Inner ring (shikiri-sen) */}
          <div className="absolute inset-4 rounded-full border-2 border-amber-700/50" />

          {/* Center line */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-amber-700/30 -translate-y-1/2" />

          {/* East Rikishi */}
          <div
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: `${50 + eastPos.x}%`,
              top: `${50 + eastPos.y}%`,
              transform: `translate(-50%, -50%) rotate(${eastPos.rotation}deg) scale(${eastPos.scale})`
            }}
          >
            <RikishiFigure
              name={eastRikishi.shikona}
              side="east"
              state={eastPos.state}
              isWinner={result.winner === "east" && currentPhase === "complete"}
            />
          </div>

          {/* West Rikishi */}
          <div
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: `${50 + westPos.x}%`,
              top: `${50 + westPos.y}%`,
              transform: `translate(-50%, -50%) rotate(${westPos.rotation}deg) scale(${westPos.scale})`
            }}
          >
            <RikishiFigure
              name={westRikishi.shikona}
              side="west"
              state={westPos.state}
              isWinner={result.winner === "west" && currentPhase === "complete"}
            />
          </div>

          {/* Phase label */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="text-xs">
              {getPhaseLabel(currentPhase)}
            </Badge>
          </div>
        </div>

        {/* Narration */}
        <div className="text-center p-4 bg-secondary/50 rounded-lg min-h-[3rem]">
          <p className="text-sm font-medium">{currentNarration}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={getOverallProgress(currentPhase, phaseProgress)} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Ritual</span>
            <span>Tachiai</span>
            <span>Battle</span>
            <span>Finish</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button variant={isPlaying ? "secondary" : "default"} size="icon" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <Button variant="outline" size="icon" onClick={handleSkipToEnd}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Speed:</span>
            <div className="flex gap-1">
              {[0.5, 1, 2].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? "default" : "outline"}
                  size="sm"
                  className="text-xs px-2"
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled((s) => !s)}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Kimarite Display */}
        {currentPhase === "complete" && (
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Winning Technique</p>
            <p className="text-xl font-display font-bold">{result.kimariteName}</p>
            {result.upset && (
              <Badge variant="destructive" className="mt-2">
                UPSET!
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Rikishi figure component
interface RikishiFigureProps {
  name: string;
  side: "east" | "west";
  state: RikishiPosition["state"];
  isWinner: boolean;
}

function RikishiFigure({ name, side, state, isWinner }: RikishiFigureProps) {
  const baseColor = side === "east" ? "bg-blue-600" : "bg-red-600";
  const stateStyles: Record<RikishiPosition["state"], string> = {
    standing: "scale-100",
    charging: "scale-110 animate-pulse",
    grappling: "scale-105",
    pushing: "scale-110",
    falling: "scale-75 opacity-70",
    victory: "scale-115"
  };

  return (
    <div className={cn("relative flex flex-col items-center transition-all duration-200", stateStyles[state])}>
      {/* Body */}
      <div className={cn("w-12 h-14 rounded-full", baseColor, isWinner && "ring-2 ring-yellow-400 ring-offset-1")} />

      {/* Head */}
      <div
        className={cn(
          "absolute -top-3 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-300",
          state === "falling" && "bg-red-200"
        )}
      />

      {/* Arms based on state */}
      {(state === "grappling" || state === "pushing") && (
        <>
          <div className={cn("absolute top-4 -left-3 w-4 h-2 rounded-full", baseColor)} />
          <div className={cn("absolute top-4 -right-3 w-4 h-2 rounded-full", baseColor)} />
        </>
      )}

      {/* Name label */}
      <div className="absolute -bottom-5 whitespace-nowrap">
        <span className="text-[10px] font-medium bg-background/80 px-1 rounded">{name.slice(0, 8)}</span>
      </div>

      {/* Victory crown */}
      {isWinner && state === "victory" && <div className="absolute -top-6 text-yellow-500">👑</div>}
    </div>
  );
}

function getPhaseLabel(phase: ReplayPhase): string {
  const labels: Record<ReplayPhase, string> = {
    ritual: "Pre-Bout Ritual",
    tachiai: "Tachiai!",
    clinch: "Grip Battle",
    momentum: "Exchange",
    finish: "Decisive Moment",
    ceremony: "Victory",
    complete: "Bout Complete"
  };
  return labels[phase];
}

function getPhaseNarration(phase: ReplayPhase, result: BoutResult, east: Rikishi, west: Rikishi): string {
  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  switch (phase) {
    case "ritual":
      return `${east.shikona} vs ${west.shikona}. The wrestlers prepare.`;
    case "tachiai":
      return "The fan drops... TACHIAI!";
    case "clinch":
      return "Both wrestlers seek position...";
    case "momentum":
      return `${winner.shikona} presses the advantage!`;
    case "finish":
      return `${winner.shikona} executes ${result.kimariteName}!`;
    case "ceremony":
      return `${winner.shikona} receives the bow.`;
    case "complete":
      return `${winner.shikona} defeats ${loser.shikona} by ${result.kimariteName}.`;
  }
}

function getOverallProgress(phase: ReplayPhase, phaseProgress: number): number {
  const phaseIndex = PHASES.indexOf(phase);
  const phaseWeight = 100 / (PHASES.length - 1);
  return phaseIndex * phaseWeight + (phaseProgress / 100) * phaseWeight;
}
