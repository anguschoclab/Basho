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
import { getReplayPhaseDurations } from "@/engine/bout/ReplayMetadata";
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
  type ReplayPhase,
  type RikishiState,
  type Particle,
} from "./boutCanvas";

export interface UseBoutReplayReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: number;
  setSpeed: (s: number) => void;
  uiPhase: ReplayPhase;
  narration: string;
  overallPct: number;
  reset: () => void;
}

export function useBoutReplay(
  result: BoutResult,
  eastRikishi: UIRikishi,
  westRikishi: UIRikishi,
  autoPlay: boolean,
  onComplete?: () => void
): UseBoutReplayReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [uiPhase, setUiPhase] = useState<ReplayPhase>("ritual");
  const [narration, setNarration] = useState("");

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

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const winnerSide = result.winnerRikishiId === eastRikishi.id ? "east" : "west";
  const phaseDurations = useMemo(() => getReplayPhaseDurations(result), [result]);
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
    setUiPhase("ritual");
    setNarration(lines[0] || "");
    setIsPlaying(false);
  }, [lines]);

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

      const W = canvas.width;
      const H = canvas.height;

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
              spawnParticles("impact", W * (winnerSide === "east" ? 0.62 : 0.38), H * 0.5, 18);
              spawnParticles("dust", W * 0.5, H * 0.6, 12);
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
      const target = getTargetState(phaseRef.current, progressRef.current, winnerSide);
      const smooth = clamp(delta * 0.012, 0, 0.25);
      eastRef.current = lerpState(eastRef.current, target.east, smooth);
      westRef.current = lerpState(westRef.current, target.west, smooth);

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
      ctx.clearRect(0, 0, W, H);
      const shake = shakeRef.current;
      drawDohyo(ctx, W, H, shake);
      drawParticles(ctx, particlesRef.current);
      drawRikishi(ctx, westRef.current, W, H, "west", westRikishi, shake);
      drawRikishi(ctx, eastRef.current, W, H, "east", eastRikishi, shake);
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
        phaseRef.current
      );

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
    result,
    eastRikishi,
    westRikishi,
    spawnParticles,
    onComplete,
    rng,
  ]);

  // Static draw when paused
  useEffect(() => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width,
      H = canvas.height;
    drawDohyo(ctx, W, H, { x: 0, y: 0 });
    drawRikishi(ctx, westRef.current, W, H, "west", westRikishi, { x: 0, y: 0 });
    drawRikishi(ctx, eastRef.current, W, H, "east", eastRikishi, { x: 0, y: 0 });
  }, [isPlaying, eastRikishi, westRikishi]);

  const phaseIdx = PHASES.indexOf(uiPhase);
  const overallPct = ((phaseIdx + progressRef.current) / (PHASES.length - 1)) * 100;

  return {
    canvasRef,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    uiPhase,
    narration,
    overallPct,
    reset,
  };
}
