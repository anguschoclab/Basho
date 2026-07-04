/**
 * src/components/game/boutReplay/useBoutReplay.ts
 * ================================================
 * Custom hook that owns all animation state, refs, and the RAF loop
 * for the BoutReplayViewer. Extracted from the BoutReplayViewer monolith
 * for separation of concerns and testability.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import { getReplayPhaseDurations, buildBoutScript } from "@/engine/bout/ReplayMetadata";
import type { BoutScript } from "@/engine/bout/ReplayMetadata";
import { SeededRNG } from "@/engine/rng";
import {
  PHASES,
  clamp,
  easeOut,
  getTargetState,
  lerpState,
  getCrowdIntensity,
  getNarrationLines,
  getPhaseNarrationIndex,
  drawDohyo,
  drawRikishi,
  drawParticles,
  drawImpactFlash,
  drawKimariteBanner,
  drawUpsetBanner,
  drawCrowdAtmosphere,
  computeArcProgress,
  computeArcHeight,
  seekToPhase,
  computeGlobalProgress,
  type ReplayPhase,
  type RikishiState,
  type Particle,
} from "./boutCanvas";

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
  onProgressUpdate?: (progress: BoutReplayProgress) => void,
): UseBoutReplayReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // HiDPI canvas setup — set backing store to CSS_W * dpr and scale context.
  // Runs once on mount; all draw code uses CSS-pixel constants (800/500).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    const CSS_W = 800;
    const CSS_H = 500;
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    canvas.style.width = `${CSS_W}px`;
    canvas.style.height = `${CSS_H}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

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

  // Animation data in refs (no re-render needed for canvas)
  const phaseRef = useRef<ReplayPhase>("ritual");
  const progressRef = useRef(0);
  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  const eastRef = useRef<RikishiState>({
    pos: { x: 0.27, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const westRef = useRef<RikishiState>({
    pos: { x: 0.73, y: 0.52 },
    rotation: 0,
    scale: 1,
    bodyPhase: "standing",
    opacity: 1,
  });
  const particlesRef = useRef<Particle[]>([]);
  const particleId = useRef(0);
  const flashRef = useRef(0);
  const shakeRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const narIndexRef = useRef(-1);
  const boutProgressRef = useRef<BoutReplayProgress>({
    phaseIndex: 0,
    phaseProgress: 0,
    globalProgress: 0,
    totalDurationMs: 0,
    elapsedMs: 0,
  });
  const lastProgressUpdateRef = useRef(0);
  const onProgressUpdateRef = useRef(onProgressUpdate);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const winnerSide = result.winnerRikishiId === eastRikishi.id ? "east" : "west";
  const boutScript = useMemo<BoutScript>(() => buildBoutScript(result), [result]);
  const phaseDurations = useMemo(
    () => getReplayPhaseDurations(result, boutScript),
    [result, boutScript],
  );
  const rng = useMemo(() => new SeededRNG(result.boutId || "seed"), [result.boutId]);
  const lines = useMemo(
    () => getNarrationLines(result, eastRikishi, westRikishi),
    [result, eastRikishi, westRikishi]
  );

  const spawnParticles = useCallback(
    (type: Particle["type"], x: number, y: number, count: number) => {
      const np: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = rng.next() * Math.PI * 2;
        const spd = 0.6 + rng.next() * 3;
        const colors: Record<Particle["type"], string> = {
          impact: `hsl(${30 + rng.next() * 20},90%,60%)`,
          salt: `rgba(255,255,255,${0.7 + rng.next() * 0.3})`,
          dust: `hsl(38,55%,${55 + rng.next() * 20}%)`,
          spark: `hsl(50,100%,70%)`,
          zabuton: ["#7c3aed", "#db2777", "#0891b2", "#059669"][Math.floor(rng.next() * 4)],
        };
        np.push({
          id: particleId.current++,
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - (type === "salt" ? 2.5 : 0),
          life: 1,
          maxLife: 0.4 + rng.next() * 0.9,
          size:
            type === "salt"
              ? 2 + rng.next() * 3
              : type === "zabuton"
                ? 8 + rng.next() * 8
                : 3 + rng.next() * 5,
          color: colors[type],
          type,
        });
      }
      particlesRef.current = [...particlesRef.current.slice(-60), ...np];
    },
    [rng]
  );

  const reset = useCallback(() => {
    phaseRef.current = "ritual";
    progressRef.current = 0;
    flashRef.current = 0;
    shakeRef.current = { x: 0, y: 0 };
    particlesRef.current = [];
    narIndexRef.current = -1;
    const zeroProgress: BoutReplayProgress = {
      phaseIndex: 0,
      phaseProgress: 0,
      globalProgress: 0,
      totalDurationMs: boutProgressRef.current.totalDurationMs,
      elapsedMs: 0,
    };
    boutProgressRef.current = zeroProgress;
    setProgress(zeroProgress);
    setUiPhase("ritual");
    setNarration(lines[0] || "");
    setIsPlaying(false);
  }, [lines]);

  const phaseDurationsArr = useMemo(
    () => PHASES.map((p) => phaseDurations[p] || 0),
    [phaseDurations],
  );

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      const shake = shakeRef.current;
      ctx.clearRect(0, 0, W, H);
      drawDohyo(ctx, W, H, shake);
      drawParticles(ctx, particlesRef.current);
      drawRikishi(ctx, westRef.current, W, H, "west", westRikishi, shake,
        boutScript.family, winnerSide !== "west");
      drawRikishi(ctx, eastRef.current, W, H, "east", eastRikishi, shake,
        boutScript.family, winnerSide !== "east");
      drawImpactFlash(ctx, W, H, flashRef.current);

      if (phaseRef.current === "finish" || phaseRef.current === "ceremony") {
        const bannerAlpha = phaseRef.current === "finish" ? easeOut(progressRef.current) : 1;
        drawKimariteBanner(ctx, W, H, result.kimariteName || result.kimarite, bannerAlpha);
      }
      if (phaseRef.current === "ceremony" && (result.upset || result.isKinboshi)) {
        drawUpsetBanner(ctx, W, H, easeOut(progressRef.current), !!result.isKinboshi);
      }

      drawCrowdAtmosphere(
        ctx,
        W,
        H,
        getCrowdIntensity(phaseRef.current, progressRef.current),
        phaseRef.current,
      );
    },
    [boutScript, winnerSide, result, eastRikishi, westRikishi],
  );

  const updateProgress = useCallback(() => {
    const phaseIdx = PHASES.indexOf(phaseRef.current);
    const computed = computeGlobalProgress(phaseIdx, progressRef.current, phaseDurationsArr);
    const newProgress: BoutReplayProgress = {
      phaseIndex: phaseIdx,
      phaseProgress: progressRef.current,
      ...computed,
    };
    boutProgressRef.current = newProgress;

    const now = performance.now();
    if (now - lastProgressUpdateRef.current >= 100) {
      lastProgressUpdateRef.current = now;
      setProgress(newProgress);
      onProgressUpdateRef.current?.(newProgress);
    }
  }, [phaseDurationsArr]);

  const seekTo = useCallback(
    (globalProgress: number) => {
      const target = seekToPhase(globalProgress, phaseDurationsArr);
      const newPhase = PHASES[target.phaseIndex] || "ritual";
      phaseRef.current = newPhase;
      progressRef.current = target.phaseProgress;
      setUiPhase(newPhase);

      const ni = getPhaseNarrationIndex(newPhase, target.phaseProgress, lines.length);
      narIndexRef.current = ni;
      setNarration(lines[ni] || "");

      const computed = computeGlobalProgress(target.phaseIndex, target.phaseProgress, phaseDurationsArr);
      const newProgress: BoutReplayProgress = {
        phaseIndex: target.phaseIndex,
        phaseProgress: target.phaseProgress,
        ...computed,
      };
      boutProgressRef.current = newProgress;
      lastProgressUpdateRef.current = performance.now();
      setProgress(newProgress);
      onProgressUpdateRef.current?.(newProgress);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) drawFrame(ctx, 800, 500);
      }
    },
    [phaseDurationsArr, lines, drawFrame],
  );

  // ── Main RAF loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = 0;

    const loop = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const W = 800;
      const H = 500;

      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDelta = clamp(timestamp - lastTimeRef.current, 0, 100);
      const delta = rawDelta * speedRef.current;
      lastTimeRef.current = timestamp;

      // Advance phase progress
      const phase = phaseRef.current;
      const duration = phaseDurations[phase] || 2000;
      if (phase !== "complete") {
        progressRef.current = clamp(progressRef.current + delta / duration, 0, 1);
        if (progressRef.current >= 1) {
          const idx = PHASES.indexOf(phase);
          if (idx < PHASES.length - 1) {
            const next = PHASES[idx + 1];
            phaseRef.current = next;
            progressRef.current = 0;
            setUiPhase(next);
            if (next === "tachiai") {
              spawnParticles("salt", W * 0.3, H * 0.52, 18);
              spawnParticles("salt", W * 0.7, H * 0.52, 18);
            }
            if (next === "clinch") {
              flashRef.current = 1;
              spawnParticles("impact", W * 0.5, H * 0.5, 22);
              spawnParticles("dust", W * 0.5, H * 0.5, 14);
              shakeRef.current = {
                x: (rng.next() - 0.5) * 16,
                y: (rng.next() - 0.5) * 10,
              };
            }
            if (next === "finish") {
              const loserX = W * (winnerSide === "east" ? 0.78 : 0.22);
              const loserY = H * 0.6;
              switch (boutScript.family) {
                case "throw":
                  spawnParticles("spark", loserX, loserY, 18);
                  break;
                case "force_out":
                  spawnParticles(
                    "dust",
                    W * (winnerSide === "east" ? 0.88 : 0.12),
                    H * 0.55,
                    14,
                  );
                  break;
                case "pull":
                  spawnParticles("impact", W * 0.5, H * 0.5, 16);
                  break;
                case "lift":
                  if (result.upset || result.isKinboshi) {
                    spawnParticles("zabuton", W * 0.5, H * 0.1, 10);
                  } else {
                    spawnParticles("dust", loserX, loserY, 8);
                  }
                  break;
                case "trip":
                  spawnParticles("dust", loserX, loserY, 12);
                  break;
                default:
                  spawnParticles("impact", W * 0.5, H * 0.5, 12);
                  spawnParticles("dust", W * 0.5, H * 0.6, 8);
              }
            }
            if (next === "ceremony" && (result.upset || result.isKinboshi)) {
              spawnParticles("zabuton", W * 0.5, H * 0.35, 14);
            }
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onComplete?.();
            animRef.current = requestAnimationFrame(loop);
            return;
          }
        }
      }

      // Update rikishi positions
      const target = getTargetState(phaseRef.current, progressRef.current, winnerSide, boutScript);
      const smooth = clamp(delta * 0.012, 0, 0.25);
      eastRef.current = lerpState(eastRef.current, target.east, smooth);
      westRef.current = lerpState(westRef.current, target.west, smooth);

      // Drive live arc animation for throw/lift families during finish phase
      if (phaseRef.current === "finish") {
        const arcProgress = computeArcProgress(progressRef.current, boutScript.family);
        const arcHeight = computeArcHeight(arcProgress, boutScript.family);
        if (arcProgress > 0) {
          const loserRef = winnerSide === "east" ? westRef : eastRef;
          loserRef.current = {
            ...loserRef.current,
            arcProgress,
            arcHeight,
          };
        }
      }

      // Update particles
      const gravity = 0.04;
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy + gravity,
          vy: p.vy + gravity,
          life: p.life - delta * 0.001,
        }))
        .filter((p) => p.life > 0);

      // Decay flash & shake
      flashRef.current = clamp(flashRef.current - delta * 0.0028, 0, 1);
      shakeRef.current = {
        x: shakeRef.current.x * (1 - delta * 0.015),
        y: shakeRef.current.y * (1 - delta * 0.015),
      };

      // Narration update
      const ni = getPhaseNarrationIndex(phaseRef.current, progressRef.current, lines.length);
      if (ni !== narIndexRef.current) {
        narIndexRef.current = ni;
        setNarration(lines[ni] || "");
      }

      // Occasional mid-phase particles
      if (phaseRef.current === "ritual" && rng.next() < 0.008 * (delta / 16)) {
        spawnParticles("salt", W * (0.22 + rng.next() * 0.1), H * 0.48, 4);
      }
      if (
        (phaseRef.current === "clinch" || phaseRef.current === "momentum") &&
        rng.next() < 0.01 * (delta / 16)
      ) {
        spawnParticles("dust", W * 0.5, H * 0.52, 3);
      }
      if (
        phaseRef.current === "tachiai" &&
        progressRef.current < 0.3 &&
        rng.next() < 0.05 * (delta / 16)
      ) {
        spawnParticles("spark", W * 0.5, H * 0.5, 5);
      }

      // DRAW
      drawFrame(ctx, W, H);

      // Update progress (throttled)
      updateProgress();

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [
    isPlaying,
    phaseDurations,
    lines,
    winnerSide,
    boutScript,
    result,
    eastRikishi,
    westRikishi,
    spawnParticles,
    onComplete,
    rng,
    drawFrame,
    updateProgress,
  ]);

  // Static draw when paused
  useEffect(() => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawFrame(ctx, 800, 500);
  }, [isPlaying, drawFrame]);

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
