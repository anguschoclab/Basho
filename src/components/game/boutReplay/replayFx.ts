/**
 * replayFx.ts
 *
 * Particle spawning and frame drawing for the bout replay canvas.
 * All state lives in refs owned by the caller — these are pure
 * helpers over a shared runtime bag.
 */

import {
  easeOut,
  getCrowdIntensity,
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
import type { SeededRNG } from "@/presenters/engineAccess";
import type { BoutResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { BoutScript } from "@/presenters/engineAccess";

/** Refs + params shared across the replay runtime helpers. */
export interface ReplayRuntime {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  animRef: React.MutableRefObject<number | null>;
  isPlayingRef: React.MutableRefObject<boolean>;
  speedRef: React.MutableRefObject<number>;
  phaseRef: React.MutableRefObject<ReplayPhase>;
  progressRef: React.MutableRefObject<number>;
  eastRef: React.MutableRefObject<RikishiState>;
  westRef: React.MutableRefObject<RikishiState>;
  particlesRef: React.MutableRefObject<Particle[]>;
  particleId: React.MutableRefObject<number>;
  flashRef: React.MutableRefObject<number>;
  shakeRef: React.MutableRefObject<{ x: number; y: number }>;
  lastTimeRef: React.MutableRefObject<number>;
  narIndexRef: React.MutableRefObject<number>;
  rng: SeededRNG;
  result: BoutResult;
  winnerSide: "east" | "west";
  boutScript: BoutScript;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  lines: string[];
  spawnParticles: (type: Particle["type"], x: number, y: number, count: number) => void;
}

/** Spawn a burst of particles into the runtime's particle list. */
export function makeSpawnParticles(
  particlesRef: React.MutableRefObject<Particle[]>,
  particleId: React.MutableRefObject<number>,
  rng: SeededRNG
): (type: Particle["type"], x: number, y: number, count: number) => void {
  return (type, x, y, count) => {
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
  };
}

/** Draw one replay frame to the canvas context (CSS-pixel space). */
export function drawReplayFrame(
  rt: ReplayRuntime,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  const shake = rt.shakeRef.current;
  ctx.clearRect(0, 0, W, H);
  drawDohyo(ctx, W, H, shake);
  drawParticles(ctx, rt.particlesRef.current);
  drawRikishi(
    ctx,
    rt.westRef.current,
    W,
    H,
    "west",
    rt.westRikishi,
    shake,
    rt.boutScript.family,
    rt.winnerSide !== "west"
  );
  drawRikishi(
    ctx,
    rt.eastRef.current,
    W,
    H,
    "east",
    rt.eastRikishi,
    shake,
    rt.boutScript.family,
    rt.winnerSide !== "east"
  );
  drawImpactFlash(ctx, W, H, rt.flashRef.current);

  if (rt.phaseRef.current === "finish" || rt.phaseRef.current === "ceremony") {
    const bannerAlpha = rt.phaseRef.current === "finish" ? easeOut(rt.progressRef.current) : 1;
    drawKimariteBanner(ctx, W, H, rt.result.kimariteName || rt.result.kimarite, bannerAlpha);
  }
  if (rt.phaseRef.current === "ceremony" && (rt.result.upset || rt.result.isKinboshi)) {
    drawUpsetBanner(ctx, W, H, easeOut(rt.progressRef.current), !!rt.result.isKinboshi);
  }

  drawCrowdAtmosphere(
    ctx,
    W,
    H,
    getCrowdIntensity(rt.phaseRef.current, rt.progressRef.current),
    rt.phaseRef.current
  );
}
