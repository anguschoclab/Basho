/**
 * replayLoop.ts
 *
 * The per-frame simulation tick for the bout replay RAF loop:
 * phase advancement + transition effects, rikishi lerp, particles,
 * flash/shake decay, narration, and ambient particles.
 */

import {
  PHASES,
  clamp,
  getTargetState,
  lerpState,
  getPhaseNarrationIndex,
  computeArcProgress,
  computeArcHeight,
  type ReplayPhase,
} from "./boutCanvas";
import type { ReplayRuntime } from "./replayFx";

/** Extra setters the tick needs beyond the shared runtime bag. */
export interface ReplayTickCtx extends ReplayRuntime {
  phaseDurations: Record<ReplayPhase, number>;
  setUiPhase: (p: ReplayPhase) => void;
  setNarration: (s: string) => void;
  setIsPlaying: (playing: boolean) => void;
  onComplete?: () => void;
}

/** Spawn the transition effects for entering a new phase. */
function emitPhaseTransition(ctx: ReplayTickCtx, next: ReplayPhase, W: number, H: number): void {
  const { rng, result, winnerSide, boutScript, spawnParticles } = ctx;
  if (next === "tachiai") {
    spawnParticles("salt", W * 0.3, H * 0.52, 18);
    spawnParticles("salt", W * 0.7, H * 0.52, 18);
  }
  if (next === "clinch") {
    ctx.flashRef.current = 1;
    spawnParticles("impact", W * 0.5, H * 0.5, 22);
    spawnParticles("dust", W * 0.5, H * 0.5, 14);
    ctx.shakeRef.current = {
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
        spawnParticles("dust", W * (winnerSide === "east" ? 0.88 : 0.12), H * 0.55, 14);
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
}

/**
 * Advance the replay clock; returns false when the bout completes
 * (no further frames should be scheduled).
 */
function advancePhase(ctx: ReplayTickCtx, delta: number, W: number, H: number): boolean {
  const phase = ctx.phaseRef.current;
  const duration = ctx.phaseDurations[phase] || 2000;
  if (phase === "complete") return true;
  ctx.progressRef.current = clamp(ctx.progressRef.current + delta / duration, 0, 1);
  if (ctx.progressRef.current < 1) return true;
  const idx = PHASES.indexOf(phase);
  if (idx < PHASES.length - 1) {
    const next = PHASES[idx + 1];
    ctx.phaseRef.current = next;
    ctx.progressRef.current = 0;
    ctx.setUiPhase(next);
    emitPhaseTransition(ctx, next, W, H);
    return true;
  }
  ctx.isPlayingRef.current = false;
  ctx.setIsPlaying(false);
  ctx.onComplete?.();
  return false;
}

/** Ambient mid-phase particles. */
function tickAmbient(ctx: ReplayTickCtx, delta: number, W: number, H: number): void {
  const { rng, spawnParticles } = ctx;
  if (ctx.phaseRef.current === "ritual" && rng.next() < 0.008 * (delta / 16)) {
    spawnParticles("salt", W * (0.22 + rng.next() * 0.1), H * 0.48, 4);
  }
  if (
    (ctx.phaseRef.current === "clinch" || ctx.phaseRef.current === "momentum") &&
    rng.next() < 0.01 * (delta / 16)
  ) {
    spawnParticles("dust", W * 0.5, H * 0.52, 3);
  }
  if (
    ctx.phaseRef.current === "tachiai" &&
    ctx.progressRef.current < 0.3 &&
    rng.next() < 0.05 * (delta / 16)
  ) {
    spawnParticles("spark", W * 0.5, H * 0.5, 5);
  }
}

/**
 * One simulation tick. Returns false when the replay finished this frame;
 * the caller decides whether to schedule another RAF.
 */
export function replayTick(
  ctx: ReplayTickCtx,
  timestamp: number,
  drawFrame: (c: CanvasRenderingContext2D, W: number, H: number) => void,
  updateProgress: () => void
): boolean {
  const canvas = ctx.canvasRef.current;
  if (!canvas) return true;
  const ictx = canvas.getContext("2d");
  if (!ictx) return true;

  const W = 800;
  const H = 500;

  if (!ctx.lastTimeRef.current) ctx.lastTimeRef.current = timestamp;
  const rawDelta = clamp(timestamp - ctx.lastTimeRef.current, 0, 100);
  const delta = rawDelta * ctx.speedRef.current;
  ctx.lastTimeRef.current = timestamp;

  if (!advancePhase(ctx, delta, W, H)) return false;

  // Update rikishi positions
  const target = getTargetState(ctx.phaseRef.current, ctx.progressRef.current, ctx.winnerSide, ctx.boutScript);
  const smooth = clamp(delta * 0.012, 0, 0.25);
  ctx.eastRef.current = lerpState(ctx.eastRef.current, target.east, smooth);
  ctx.westRef.current = lerpState(ctx.westRef.current, target.west, smooth);

  // Drive live arc animation for throw/lift families during finish phase
  if (ctx.phaseRef.current === "finish") {
    const arcProgress = computeArcProgress(ctx.progressRef.current, ctx.boutScript.family);
    const arcHeight = computeArcHeight(arcProgress, ctx.boutScript.family);
    if (arcProgress > 0) {
      const loserRef = ctx.winnerSide === "east" ? ctx.westRef : ctx.eastRef;
      loserRef.current = {
        ...loserRef.current,
        arcProgress,
        arcHeight,
      };
    }
  }

  // Update particles
  const gravity = 0.04;
  ctx.particlesRef.current = ctx.particlesRef.current
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy + gravity,
      vy: p.vy + gravity,
      life: p.life - delta * 0.001,
    }))
    .filter((p) => p.life > 0);

  // Decay flash & shake
  ctx.flashRef.current = clamp(ctx.flashRef.current - delta * 0.0028, 0, 1);
  ctx.shakeRef.current = {
    x: ctx.shakeRef.current.x * (1 - delta * 0.015),
    y: ctx.shakeRef.current.y * (1 - delta * 0.015),
  };

  // Narration update
  const ni = getPhaseNarrationIndex(ctx.phaseRef.current, ctx.progressRef.current, ctx.lines.length);
  if (ni !== ctx.narIndexRef.current) {
    ctx.narIndexRef.current = ni;
    ctx.setNarration(ctx.lines[ni] || "");
  }

  tickAmbient(ctx, delta, W, H);

  // DRAW
  drawFrame(ictx, W, H);

  // Update progress (throttled)
  updateProgress();

  return true;
}
