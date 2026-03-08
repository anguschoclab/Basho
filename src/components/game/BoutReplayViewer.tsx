// BoutReplayViewer.tsx — Premium visual bout replay
// Canvas-rendered dohyo with detailed rikishi figures, impact particles,
// crowd atmosphere, smooth interpolated animations, and full playback controls

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface Vec2 { x: number; y: number; }

interface RikishiState {
  pos: Vec2;
  rotation: number;
  scale: number;
  phase: "standing" | "bowing" | "charging" | "grappling" | "pushing" | "throwing" | "falling" | "victory";
  opacity: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "impact" | "salt" | "sweat" | "dust" | "spark";
}

const PHASE_DURATIONS: Record<ReplayPhase, number> = {
  ritual: 2500,
  tachiai: 1200,
  clinch: 2200,
  momentum: 2800,
  finish: 1800,
  ceremony: 2200,
  complete: 0,
};

const PHASES: ReplayPhase[] = ["ritual", "tachiai", "clinch", "momentum", "finish", "ceremony", "complete"];

// Smooth interpolation helper
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Crowd mood derived from phase
function getCrowdMood(phase: ReplayPhase, progress: number): { text: string; intensity: number } {
  switch (phase) {
    case "ritual": return { text: "Silence fills the arena…", intensity: 0.1 };
    case "tachiai": return { text: "TACHIAI!", intensity: 1.0 };
    case "clinch": return { text: "The crowd holds its breath…", intensity: 0.4 + progress * 0.003 };
    case "momentum": return { text: "Rising tension!", intensity: 0.6 + progress * 0.004 };
    case "finish": return { text: "決まり手！", intensity: 1.0 };
    case "ceremony": return { text: "The crowd erupts!", intensity: 0.8 };
    case "complete": return { text: "", intensity: 0 };
  }
}

export function BoutReplayViewer({
  result,
  eastRikishi,
  westRikishi,
  className,
  autoPlay = false,
  onComplete,
}: BoutReplayViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentPhase, setCurrentPhase] = useState<ReplayPhase>("ritual");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Refs for RAF closure safety
  const phaseRef = useRef(currentPhase);
  const progressRef = useRef(phaseProgress);
  const speedRef = useRef(playbackSpeed);
  const particlesRef = useRef(particles);

  useEffect(() => { phaseRef.current = currentPhase; }, [currentPhase]);
  useEffect(() => { progressRef.current = phaseProgress; }, [phaseProgress]);
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { particlesRef.current = particles; }, [particles]);

  const safeLog = useMemo(() => (Array.isArray((result as any)?.log) ? (result as any).log : []), [result]);

  // Extract tactical strategy descriptions from bout log
  const tacticalStrategies = useMemo(() => {
    const strategies: { side: "east" | "west"; strategy: string }[] = [];
    for (const entry of safeLog) {
      if (entry.data?.tacticalEntry && entry.data?.strategy) {
        strategies.push({ side: entry.data.side as "east" | "west", strategy: entry.data.strategy });
      }
    }
    return strategies;
  }, [safeLog]);

  // Compute target positions for each phase
  const getTargetState = useCallback((phase: ReplayPhase, progress01: number): { east: RikishiState; west: RikishiState } => {
    const winner = result.winner;
    const p = easeInOut(progress01);

    switch (phase) {
      case "ritual":
        return {
          east: { pos: { x: 0.25, y: 0.5 }, rotation: 0, scale: 1, phase: progress01 < 0.5 ? "standing" : "bowing", opacity: 1 },
          west: { pos: { x: 0.75, y: 0.5 }, rotation: 0, scale: 1, phase: progress01 < 0.5 ? "standing" : "bowing", opacity: 1 },
        };
      case "tachiai":
        return {
          east: { pos: { x: lerp(0.25, 0.42, p), y: 0.5 }, rotation: lerp(0, 8, p), scale: lerp(1, 1.12, p), phase: "charging", opacity: 1 },
          west: { pos: { x: lerp(0.75, 0.58, p), y: 0.5 }, rotation: lerp(0, -8, p), scale: lerp(1, 1.12, p), phase: "charging", opacity: 1 },
        };
      case "clinch": {
        const wobble = Math.sin(progress01 * Math.PI * 4) * 0.01;
        return {
          east: { pos: { x: 0.44, y: 0.5 + wobble }, rotation: lerp(8, 5, p), scale: 1.05, phase: "grappling", opacity: 1 },
          west: { pos: { x: 0.56, y: 0.5 - wobble }, rotation: lerp(-8, -5, p), scale: 1.05, phase: "grappling", opacity: 1 },
        };
      }
      case "momentum": {
        const wobble = Math.sin(progress01 * Math.PI * 6) * 0.008;
        if (winner === "east") {
          return {
            east: { pos: { x: lerp(0.44, 0.55, p), y: 0.5 + wobble }, rotation: lerp(5, 12, p), scale: lerp(1.05, 1.1, p), phase: "pushing", opacity: 1 },
            west: { pos: { x: lerp(0.56, 0.68, p), y: 0.5 - wobble }, rotation: lerp(-5, -15, p), scale: lerp(1.05, 0.95, p), phase: "grappling", opacity: 1 },
          };
        } else {
          return {
            east: { pos: { x: lerp(0.44, 0.32, p), y: 0.5 + wobble }, rotation: lerp(5, 15, p), scale: lerp(1.05, 0.95, p), phase: "grappling", opacity: 1 },
            west: { pos: { x: lerp(0.56, 0.45, p), y: 0.5 - wobble }, rotation: lerp(-5, -12, p), scale: lerp(1.05, 1.1, p), phase: "pushing", opacity: 1 },
          };
        }
      }
      case "finish": {
        if (winner === "east") {
          return {
            east: { pos: { x: lerp(0.55, 0.6, p), y: 0.5 }, rotation: lerp(12, 5, p), scale: lerp(1.1, 1.15, p), phase: "throwing", opacity: 1 },
            west: { pos: { x: lerp(0.68, 0.78, p), y: lerp(0.5, 0.62, p) }, rotation: lerp(-15, -60, p), scale: lerp(0.95, 0.75, p), phase: "falling", opacity: lerp(1, 0.85, p) },
          };
        } else {
          return {
            east: { pos: { x: lerp(0.32, 0.22, p), y: lerp(0.5, 0.62, p) }, rotation: lerp(15, 60, p), scale: lerp(0.95, 0.75, p), phase: "falling", opacity: lerp(1, 0.85, p) },
            west: { pos: { x: lerp(0.45, 0.4, p), y: 0.5 }, rotation: lerp(-12, -5, p), scale: lerp(1.1, 1.15, p), phase: "throwing", opacity: 1 },
          };
        }
      }
      case "ceremony": {
        if (winner === "east") {
          return {
            east: { pos: { x: 0.5, y: 0.48 }, rotation: 0, scale: lerp(1.15, 1.2, p), phase: "victory", opacity: 1 },
            west: { pos: { x: 0.75, y: 0.55 }, rotation: 0, scale: 0.9, phase: "standing", opacity: 0.7 },
          };
        } else {
          return {
            east: { pos: { x: 0.25, y: 0.55 }, rotation: 0, scale: 0.9, phase: "standing", opacity: 0.7 },
            west: { pos: { x: 0.5, y: 0.48 }, rotation: 0, scale: lerp(1.15, 1.2, p), phase: "victory", opacity: 1 },
          };
        }
      }
      case "complete":
      default:
        return getTargetState("ceremony", 1);
    }
  }, [result.winner]);

  // Current rikishi states
  const [eastState, setEastState] = useState<RikishiState>(() => getTargetState("ritual", 0).east);
  const [westState, setWestState] = useState<RikishiState>(() => getTargetState("ritual", 0).west);

  // Spawn particles
  const spawnParticles = useCallback((type: Particle["type"], x: number, y: number, count: number) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const id = particleIdRef.current++;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      const colors: Record<Particle["type"], string[]> = {
        impact: ["#ff6b35", "#ffd700", "#ff4500"],
        salt: ["#ffffff", "#e8e8e8", "#f0f0f0"],
        sweat: ["#87ceeb", "#add8e6"],
        dust: ["#d4a574", "#c4956a", "#b4855a"],
        spark: ["#ffd700", "#ffb700", "#ff9500"],
      };
      const colorArr = colors[type];
      newParticles.push({
        id,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "salt" ? 1 : 0),
        life: 1,
        maxLife: 0.5 + Math.random() * 0.8,
        size: type === "salt" ? 2 + Math.random() * 3 : 3 + Math.random() * 4,
        color: colorArr[Math.floor(Math.random() * colorArr.length)],
        type,
      });
    }
    setParticles(prev => [...prev.slice(-40), ...newParticles]); // cap at ~60
  }, []);

  // Narration text
  const currentNarration = useMemo(() => {
    return getPhaseNarration(currentPhase, phaseProgress / 100, result, eastRikishi, westRikishi);
  }, [currentPhase, phaseProgress, result, eastRikishi, westRikishi]);

  const crowd = useMemo(() => getCrowdMood(currentPhase, phaseProgress), [currentPhase, phaseProgress]);

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const cx = W / 2;
    const cy = H / 2;
    const dohyoRadius = Math.min(W, H) * 0.42;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background — arena floor
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#1a1510" : "#f5e6d0";
    ctx.fillRect(0, 0, W, H);

    // Crowd ring (subtle atmosphere)
    const crowdGrad = ctx.createRadialGradient(cx, cy, dohyoRadius * 0.95, cx, cy, dohyoRadius * 1.6);
    crowdGrad.addColorStop(0, "transparent");
    crowdGrad.addColorStop(0.3, isDark ? "rgba(30,20,10,0.5)" : "rgba(120,80,40,0.08)");
    crowdGrad.addColorStop(1, isDark ? "rgba(10,8,5,0.8)" : "rgba(80,50,20,0.12)");
    ctx.fillStyle = crowdGrad;
    ctx.fillRect(0, 0, W, H);

    // Crowd intensity indicator (subtle pulse)
    const crowdIntensity = crowd.intensity;
    if (crowdIntensity > 0.3) {
      const pulseAlpha = (0.02 + crowdIntensity * 0.06) * (0.5 + 0.5 * Math.sin(Date.now() * 0.004));
      ctx.fillStyle = isDark ? `rgba(255,200,100,${pulseAlpha})` : `rgba(200,100,0,${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, dohyoRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Raised dohyo platform
    ctx.save();
    ctx.fillStyle = isDark ? "#3d2b1a" : "#e8d4b8";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, dohyoRadius * 1.08, dohyoRadius * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dohyo surface (sand color)
    const dohyoGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, dohyoRadius);
    dohyoGrad.addColorStop(0, isDark ? "#6b5738" : "#f0dcc0");
    dohyoGrad.addColorStop(0.85, isDark ? "#5a4830" : "#e6c8a0");
    dohyoGrad.addColorStop(1, isDark ? "#4a3820" : "#d4b080");
    ctx.fillStyle = dohyoGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, dohyoRadius, 0, Math.PI * 2);
    ctx.fill();

    // Tawara (straw bales ring)
    ctx.strokeStyle = isDark ? "#8b7355" : "#c4a060";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, dohyoRadius, 0, Math.PI * 2);
    ctx.stroke();
    // Second inner ring
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? "#7a6245" : "#b8945a";
    ctx.beginPath();
    ctx.arc(cx, cy, dohyoRadius - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Shikiri-sen (starting lines)
    const lineLen = dohyoRadius * 0.18;
    const lineGap = dohyoRadius * 0.08;
    ctx.strokeStyle = isDark ? "#f5f5f5" : "#333333";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    // East line
    ctx.beginPath();
    ctx.moveTo(cx - lineGap, cy - lineLen);
    ctx.lineTo(cx - lineGap, cy + lineLen);
    ctx.stroke();
    // West line
    ctx.beginPath();
    ctx.moveTo(cx + lineGap, cy - lineLen);
    ctx.lineTo(cx + lineGap, cy + lineLen);
    ctx.stroke();

    // Draw particles
    particlesRef.current.forEach(p => {
      const alpha = Math.max(0, p.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === "spark") {
        // Star shape for sparks
        ctx.beginPath();
        const s = p.size * alpha;
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.4;
          const px = p.x * W + Math.cos(a) * r;
          const py = p.y * H + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // Draw rikishi
    drawRikishi(ctx, eastState, W, H, "east", eastRikishi, isDark, result.winner === "east" && (currentPhase === "ceremony" || currentPhase === "complete"));
    drawRikishi(ctx, westState, W, H, "west", westRikishi, isDark, result.winner === "west" && (currentPhase === "ceremony" || currentPhase === "complete"));

  }, [eastState, westState, particles, crowd, currentPhase, result.winner, eastRikishi, westRikishi]);

  // Render loop for canvas
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      renderCanvas();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderCanvas]);

  // Main animation loop
  useEffect(() => {
    if (!isPlaying) return;

    let prevPhaseForParticles = phaseRef.current;

    const animate = (timestamp: number) => {
      if (!lastTickRef.current) lastTickRef.current = timestamp;
      const delta = (timestamp - lastTickRef.current) * speedRef.current;
      lastTickRef.current = timestamp;

      const phase = phaseRef.current;
      const duration = PHASE_DURATIONS[phase] ?? 0;

      // Update particles
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx * 0.004,
          y: p.y + p.vy * 0.004,
          vy: p.vy + 0.15, // gravity
          life: p.life - (1 / 60) / p.maxLife,
        }))
        .filter(p => p.life > 0)
      );

      setPhaseProgress(prev => {
        if (duration === 0) return 0;
        const next = Math.min(100, prev + (delta / duration) * 100);
        const p01 = next / 100;

        // Update rikishi positions
        const targets = getTargetState(phase, p01);
        setEastState(targets.east);
        setWestState(targets.west);

        // Spawn particles at phase transitions
        if (phase !== prevPhaseForParticles) {
          prevPhaseForParticles = phase;
          if (phase === "tachiai") {
            spawnParticles("impact", 0.5, 0.5, 12);
            spawnParticles("dust", 0.5, 0.55, 8);
          } else if (phase === "finish") {
            const winX = result.winner === "east" ? 0.6 : 0.4;
            spawnParticles("spark", winX, 0.5, 15);
            spawnParticles("dust", winX, 0.55, 6);
          } else if (phase === "ritual") {
            spawnParticles("salt", 0.35, 0.45, 6);
            spawnParticles("salt", 0.65, 0.45, 6);
          }
        }

        // Phase transitions during clinch/momentum — occasional sweat
        if ((phase === "clinch" || phase === "momentum") && Math.random() < 0.02) {
          spawnParticles("sweat", 0.5 + (Math.random() - 0.5) * 0.1, 0.48, 2);
        }

        if (next >= 100) {
          const idx = PHASES.indexOf(phase);
          const nextPhase = PHASES[idx + 1];
          if (nextPhase) {
            setCurrentPhase(nextPhase);
            return 0;
          } else {
            setIsPlaying(false);
            onComplete?.();
            return 100;
          }
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [isPlaying, getTargetState, spawnParticles, result.winner, onComplete]);

  // Reset on result change
  useEffect(() => {
    handleReset();
    if (autoPlay) {
      setTimeout(() => setIsPlaying(true), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.winner, (result as any).kimarite]);

  const handlePlayPause = () => {
    setIsPlaying(p => !p);
    lastTickRef.current = 0;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPhase("ritual");
    setPhaseProgress(0);
    setParticles([]);
    const initial = getTargetState("ritual", 0);
    setEastState(initial.east);
    setWestState(initial.west);
    lastTickRef.current = 0;
  };

  const handleSkipToEnd = () => {
    setCurrentPhase("complete");
    setPhaseProgress(100);
    setIsPlaying(false);
    const final = getTargetState("ceremony", 1);
    setEastState(final.east);
    setWestState(final.west);
    onComplete?.();
  };

  const winnerName = result.winner === "east" ? eastRikishi.shikona : westRikishi.shikona;
  const overallProgress = getOverallProgress(currentPhase, phaseProgress);

  return (
    <div className={cn("rounded-xl overflow-hidden border border-border bg-card", className)}>
      {/* Canvas Viewport */}
      <div className="relative aspect-[4/3] w-full bg-muted">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "auto" }}
        />

        {/* Overlay: Phase Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <Badge
            variant="secondary"
            className={cn(
              "font-display text-xs backdrop-blur bg-background/80 border-border/50",
              currentPhase === "tachiai" && "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
              currentPhase === "finish" && "bg-amber-500/20 text-amber-400 border-amber-500/30"
            )}
          >
            {getPhaseLabel(currentPhase)}
          </Badge>
        </div>

        {/* Overlay: Names */}
        <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end pointer-events-none">
          <div className={cn(
            "px-2 py-1 rounded bg-background/80 backdrop-blur text-xs font-display font-medium",
            result.winner === "east" && currentPhase === "complete" && "ring-2 ring-amber-400"
          )}>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
            {eastRikishi.shikona}
          </div>
          <div className={cn(
            "px-2 py-1 rounded bg-background/80 backdrop-blur text-xs font-display font-medium",
            result.winner === "west" && currentPhase === "complete" && "ring-2 ring-amber-400"
          )}>
            {westRikishi.shikona}
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1.5" />
          </div>
        </div>

        {/* Crowd atmosphere bar */}
        {crowd.intensity > 0.2 && (
          <div className="absolute top-3 right-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full transition-all duration-300",
                    i < Math.ceil(crowd.intensity * 5)
                      ? "bg-amber-400"
                      : "bg-muted-foreground/20"
                  )}
                  style={{ height: `${8 + (i < Math.ceil(crowd.intensity * 5) ? crowd.intensity * 12 : 4)}px` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Narration Bar */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border/50 min-h-[3.5rem] flex items-center justify-center">
        <p className="text-sm text-center text-muted-foreground font-medium leading-snug">
          {currentNarration}
        </p>
      </div>

      {/* Progress */}
      <div className="px-4 pt-2">
        <Progress value={overallProgress} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
          <span>儀式</span>
          <span>立合</span>
          <span>組み</span>
          <span>決着</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="icon"
            className="h-9 w-9"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSkipToEnd} title="Skip">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {[0.5, 1, 2, 3].map((speed) => (
            <Button
              key={speed}
              variant={playbackSpeed === speed ? "default" : "ghost"}
              size="sm"
              className="text-xs px-2 h-7"
              onClick={() => setPlaybackSpeed(speed)}
            >
              {speed}×
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(s => !s)}>
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      {/* Result banner */}
      {currentPhase === "complete" && (
        <div className="px-4 pb-4">
          <div className="text-center py-3 rounded-lg bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Winner</p>
            <p className="text-lg font-display font-bold">{winnerName}</p>
            <p className="text-sm text-muted-foreground">by {result.kimariteName}</p>
            {result.upset && (
              <Badge variant="destructive" className="mt-1.5">🎊 UPSET!</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Canvas Drawing Helpers ────────────────────────────────

function drawRikishi(
  ctx: CanvasRenderingContext2D,
  state: RikishiState,
  W: number,
  H: number,
  side: "east" | "west",
  rikishi: Rikishi,
  isDark: boolean,
  isWinner: boolean
) {
  const drawW = W;
  const drawH = H;
  
  const x = state.pos.x * drawW;
  const y = state.pos.y * drawH;
  const scale = state.scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((state.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.globalAlpha = state.opacity;

  // Body sizing based on weight
  const weightFactor = Math.min(1.4, Math.max(0.8, (rikishi.weight || 130) / 150));
  const bodyW = 28 * weightFactor;
  const bodyH = 32 * weightFactor;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(0, bodyH * 0.45, bodyW * 0.8, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mawashi (belt)
  const mawashiColor = side === "east" ? (isDark ? "#2563eb" : "#3b82f6") : (isDark ? "#dc2626" : "#ef4444");
  ctx.fillStyle = mawashiColor;
  ctx.beginPath();
  ctx.ellipse(0, bodyH * 0.15, bodyW * 0.85, bodyH * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const skinBase = isDark ? "#d4a574" : "#e8c4a0";
  const skinDark = isDark ? "#b88a5c" : "#d4a574";
  const bodyGrad = ctx.createRadialGradient(-bodyW * 0.2, -bodyH * 0.1, 0, 0, 0, bodyW);
  bodyGrad.addColorStop(0, skinBase);
  bodyGrad.addColorStop(1, skinDark);
  ctx.fillStyle = bodyGrad;

  // Rounded body shape
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyW, bodyH * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body outline
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head
  const headR = 10 * weightFactor;
  ctx.fillStyle = skinBase;
  ctx.beginPath();
  ctx.arc(0, -bodyH * 0.55, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Hair (chonmage topknot)
  ctx.fillStyle = isDark ? "#2a1f14" : "#3d2b1a";
  ctx.beginPath();
  ctx.ellipse(0, -bodyH * 0.55 - headR * 0.7, headR * 0.5, headR * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Topknot
  ctx.beginPath();
  ctx.ellipse(0, -bodyH * 0.55 - headR * 1.0, headR * 0.2, headR * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms based on phase
  ctx.fillStyle = skinDark;
  ctx.lineWidth = 1;
  if (state.phase === "grappling" || state.phase === "pushing" || state.phase === "throwing") {
    // Extended arms
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.9, -bodyH * 0.1, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bodyW * 0.9, -bodyH * 0.1, 8, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (state.phase === "charging") {
    // Arms forward
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.7, -bodyH * 0.3, 9, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bodyW * 0.7, -bodyH * 0.3, 9, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Arms at sides
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.75, bodyH * 0.1, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bodyW * 0.75, bodyH * 0.1, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Victory crown
  if (isWinner && (state.phase === "victory")) {
    ctx.font = `${16 * weightFactor}px serif`;
    ctx.textAlign = "center";
    ctx.fillText("👑", 0, -bodyH * 0.55 - headR * 1.5);
  }

  // Falling effect
  if (state.phase === "falling") {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = isDark ? "#8b7355" : "#d4b080";
    // Dust cloud beneath
    ctx.beginPath();
    ctx.ellipse(0, bodyH * 0.4, bodyW * 1.2, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Helpers ──────────────────────────────────

function getPhaseLabel(phase: ReplayPhase): string {
  const labels: Record<ReplayPhase, string> = {
    ritual: "塩撒き · Pre-Bout Ritual",
    tachiai: "立合い · TACHIAI!",
    clinch: "組み合い · Grip Battle",
    momentum: "攻防 · Exchange",
    finish: "決まり手 · Decisive Moment",
    ceremony: "勝ち名乗り · Victory",
    complete: "取組終了 · Bout Complete",
  };
  return labels[phase];
}

function getPhaseNarration(phase: ReplayPhase, p01: number, result: BoutResult, east: Rikishi, west: Rikishi): string {
  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  switch (phase) {
    case "ritual":
      if (p01 < 0.3) return `${east.shikona} takes position on the east side.`;
      if (p01 < 0.6) return `${west.shikona} stares across the dohyo.`;
      return "Salt is thrown. Both wrestlers prepare…";
    case "tachiai":
      return "The gyōji's fan drops — TACHIAI!";
    case "clinch":
      if (p01 < 0.5) return "Both wrestlers seek the inside grip position…";
      return "A fierce struggle for belt control!";
    case "momentum":
      if (p01 < 0.4) return `${winner.shikona} begins pressing forward!`;
      if (p01 < 0.7) return `${loser.shikona} fights to hold ground at the edge!`;
      return `${winner.shikona} drives with tremendous power!`;
    case "finish":
      return `${winner.shikona} executes ${result.kimariteName || "the winning technique"}!`;
    case "ceremony":
      return `${winner.shikona} receives the bow. A decisive victory.`;
    case "complete":
      return `${winner.shikona} wins by ${result.kimariteName}.`;
  }
}

function getOverallProgress(phase: ReplayPhase, phaseProgress: number): number {
  const idx = PHASES.indexOf(phase);
  if (idx < 0) return 0;
  const totalPhases = PHASES.length - 1; // exclude "complete"
  const phaseContrib = 100 / totalPhases;
  return Math.min(100, idx * phaseContrib + (phaseProgress / 100) * phaseContrib);
}
