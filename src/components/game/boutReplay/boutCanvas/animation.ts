import type { ReplayPhase, RikishiState, BodyPhase } from "./types";
import type { BoutScript, BoutAnimationFamily } from "@/engine/bout/ReplayMetadata";
import { lerp, easeOut, easeInOut } from "./math";

export function computeArcProgress(finishProgress: number, family: BoutAnimationFamily): number {
  if (family !== "throw" && family !== "lift") return 0;
  return Math.min(1, finishProgress / 0.7);
}

export function computeArcHeight(arcProgress: number, family: BoutAnimationFamily): number {
  if (family !== "throw" && family !== "lift") return 0;
  // throw = 60px peak (dramatic uwatenage arc); lift = 45px (visible chest lift)
  const peak = family === "throw" ? 0.12 : 0.09;
  return Math.sin(arcProgress * Math.PI) * peak;
}

export function getLoserBodyPhase(family: BoutAnimationFamily): BodyPhase {
  return family === "throw" || family === "pull" || family === "lift" ? "thrown" : "falling";
}

export function getWinnerBodyPhase(family: BoutAnimationFamily): BodyPhase {
  if (family === "force_out" || family === "throw" || family === "lift") return "gripping";
  if (family === "pull") return "pushing";
  return "throwing";
}

export function getTargetState(
  phase: ReplayPhase,
  p01: number,
  winnerSide: "east" | "west",
  script: BoutScript
): { east: RikishiState; west: RikishiState } {
  const p = easeInOut(p01);
  const pe = easeOut(p01);

  switch (phase) {
    case "ritual":
      return {
        east: {
          pos: { x: 0.27, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: p01 < 0.55 ? "standing" : "bowing",
          opacity: 1,
        },
        west: {
          pos: { x: 0.73, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: p01 < 0.55 ? "standing" : "bowing",
          opacity: 1,
        },
      };
    case "tachiai": {
      // Dominant tachiai: winner surges further forward with more rotation.
      // Stalemate: reduced forward movement (slower grind).
      const surge = script.tachiaiMargin > 0.7 ? 0.06 : script.tachiaiMargin < 0.35 ? -0.04 : 0;
      const rotBoost = script.tachiaiMargin > 0.7 ? 4 : 0;
      return {
        east: {
          pos: { x: lerp(0.27, 0.42 + surge, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, 10 + rotBoost, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
        west: {
          pos: { x: lerp(0.73, 0.58 - surge, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, -10 - rotBoost, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
      };
    }
    case "clinch": {
      // Belt battle: closer positions with more inward lean.
      // Push battle: slightly wider, less lean.
      const closeness = script.hasBeltBattle ? 0.02 : 0;
      const lean = script.hasBeltBattle ? 8 : 6;
      return {
        east: {
          pos: { x: 0.43 + closeness, y: 0.5 },
          rotation: lean,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
        west: {
          pos: { x: 0.57 - closeness, y: 0.5 },
          rotation: -lean,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
      };
    }
    case "momentum":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: lerp(0.43, 0.53, pe), y: 0.5 },
            rotation: 14,
            scale: 1.12,
            bodyPhase: "pushing",
            opacity: 1,
          },
          west: {
            pos: { x: lerp(0.57, 0.67, pe), y: lerp(0.5, 0.52, p) },
            rotation: -18,
            scale: 0.96,
            bodyPhase: "grappling",
            opacity: 1,
          },
        };
      }
      return {
        east: {
          pos: { x: lerp(0.43, 0.33, pe), y: lerp(0.5, 0.52, p) },
          rotation: 18,
          scale: 0.96,
          bodyPhase: "grappling",
          opacity: 1,
        },
        west: {
          pos: { x: lerp(0.57, 0.47, pe), y: 0.5 },
          rotation: -14,
          scale: 1.12,
          bodyPhase: "pushing",
          opacity: 1,
        },
      };
    case "finish": {
      // Family-specific loser trajectories. Winner pose stays similar;
      // loser position/rotation/scale varies by animation family.
      const f = script.family;
      const loserPhase = getLoserBodyPhase(f);
      const winnerPhase = getWinnerBodyPhase(f);
      const loserArcHeight = f === "throw" ? 0.12 : f === "lift" ? 0.09 : undefined;
      const loserArcProgress = loserArcHeight != null ? 1.0 : undefined;
      if (winnerSide === "east") {
        // Loser (west) family-specific end positions
        const loserEndX =
          f === "throw"
            ? 0.82
            : f === "pull"
              ? 0.72
              : f === "lift"
                ? 0.78
                : f === "trip"
                  ? 0.76
                  : 0.8;
        const loserEndY =
          f === "throw"
            ? 0.66
            : f === "pull"
              ? 0.6
              : f === "lift"
                ? 0.58
                : f === "trip"
                  ? 0.68
                  : 0.63;
        const loserEndRot =
          f === "throw" ? -80 : f === "pull" ? -65 : f === "lift" ? -55 : f === "trip" ? -60 : -65;
        const loserEndScale = f === "lift" ? 0.78 : f === "trip" ? 0.68 : 0.72;
        // Winner lateral sidestep for pull family
        const winnerEndX = f === "pull" ? 0.5 : 0.56;
        const winnerRot = f === "pull" ? 8 : 4;
        return {
          east: {
            pos: { x: lerp(0.53, winnerEndX, p), y: lerp(0.5, 0.49, p) },
            rotation: winnerRot,
            scale: f === "lift" ? lerp(1.16, 1.22, p) : 1.16,
            bodyPhase: winnerPhase,
            opacity: 1,
          },
          west: {
            pos: { x: lerp(0.67, loserEndX, p), y: lerp(0.52, loserEndY, p) },
            rotation: lerp(-18, loserEndRot, p),
            scale: lerp(0.96, loserEndScale, p),
            bodyPhase: loserPhase,
            opacity: lerp(1, 0.75, p),
            arcHeight: loserArcHeight,
            arcProgress: loserArcProgress,
          },
        };
      }
      // Winner = west, loser = east (mirror)
      const loserEndX =
        f === "throw"
          ? 0.18
          : f === "pull"
            ? 0.28
            : f === "lift"
              ? 0.22
              : f === "trip"
                ? 0.24
                : 0.2;
      const loserEndY =
        f === "throw"
          ? 0.66
          : f === "pull"
            ? 0.6
            : f === "lift"
              ? 0.58
              : f === "trip"
                ? 0.68
                : 0.63;
      const loserEndRot =
        f === "throw" ? 80 : f === "pull" ? 65 : f === "lift" ? 55 : f === "trip" ? 60 : 65;
      const loserEndScale = f === "lift" ? 0.78 : f === "trip" ? 0.68 : 0.72;
      const winnerEndX = f === "pull" ? 0.5 : 0.44;
      const winnerRot = f === "pull" ? -8 : -4;
      return {
        east: {
          pos: { x: lerp(0.33, loserEndX, p), y: lerp(0.52, loserEndY, p) },
          rotation: lerp(18, loserEndRot, p),
          scale: lerp(0.96, loserEndScale, p),
          bodyPhase: loserPhase,
          opacity: lerp(1, 0.75, p),
          arcHeight: loserArcHeight,
          arcProgress: loserArcProgress,
        },
        west: {
          pos: { x: lerp(0.47, winnerEndX, p), y: lerp(0.5, 0.49, p) },
          rotation: winnerRot,
          scale: f === "lift" ? lerp(1.16, 1.22, p) : 1.16,
          bodyPhase: winnerPhase,
          opacity: 1,
        },
      };
    }
    case "ceremony":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: 0.5, y: 0.48 },
            rotation: 0,
            scale: 1.22,
            bodyPhase: "victory",
            opacity: 1,
          },
          west: {
            pos: { x: 0.76, y: 0.55 },
            rotation: 0,
            scale: 0.88,
            bodyPhase: "standing",
            opacity: 0.65,
          },
        };
      }
      return {
        east: {
          pos: { x: 0.24, y: 0.55 },
          rotation: 0,
          scale: 0.88,
          bodyPhase: "standing",
          opacity: 0.65,
        },
        west: {
          pos: { x: 0.5, y: 0.48 },
          rotation: 0,
          scale: 1.22,
          bodyPhase: "victory",
          opacity: 1,
        },
      };
    default:
      return {
        east: {
          pos: { x: 0.27, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: "standing",
          opacity: 1,
        },
        west: {
          pos: { x: 0.73, y: 0.52 },
          rotation: 0,
          scale: 1,
          bodyPhase: "standing",
          opacity: 1,
        },
      };
  }
}

export function lerpState(a: RikishiState, b: RikishiState, t: number): RikishiState {
  return {
    pos: { x: lerp(a.pos.x, b.pos.x, t), y: lerp(a.pos.y, b.pos.y, t) },
    rotation: lerp(a.rotation, b.rotation, t),
    scale: lerp(a.scale, b.scale, t),
    bodyPhase: t > 0.5 ? b.bodyPhase : a.bodyPhase,
    opacity: lerp(a.opacity, b.opacity, t),
    arcHeight:
      a.arcHeight != null && b.arcHeight != null ? lerp(a.arcHeight, b.arcHeight, t) : b.arcHeight,
    arcProgress:
      a.arcProgress != null && b.arcProgress != null
        ? lerp(a.arcProgress, b.arcProgress, t)
        : b.arcProgress,
  };
}

export function getCrowdIntensity(phase: ReplayPhase, progress: number): number {
  switch (phase) {
    case "ritual":
      return 0.08 + progress * 0.05;
    case "tachiai":
      return 0.85 + progress * 0.15;
    case "clinch":
      return 0.35 + progress * 0.25;
    case "momentum":
      return 0.55 + progress * 0.3;
    case "finish":
      return 0.9;
    case "ceremony":
      return 0.75;
    default:
      return 0;
  }
}
