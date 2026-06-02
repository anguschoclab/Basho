import type { ReplayPhase, RikishiState } from "./types";
import { lerp, easeOut, easeInOut } from "./math";

export function getTargetState(
  phase: ReplayPhase,
  p01: number,
  winnerSide: "east" | "west"
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
    case "tachiai":
      return {
        east: {
          pos: { x: lerp(0.27, 0.42, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, 10, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
        west: {
          pos: { x: lerp(0.73, 0.58, p), y: lerp(0.52, 0.5, p) },
          rotation: lerp(0, -10, p),
          scale: lerp(1, 1.1, p),
          bodyPhase: "charging",
          opacity: 1,
        },
      };
    case "clinch":
      return {
        east: {
          pos: { x: 0.43, y: 0.5 },
          rotation: 6,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
        west: {
          pos: { x: 0.57, y: 0.5 },
          rotation: -6,
          scale: 1.06,
          bodyPhase: "grappling",
          opacity: 1,
        },
      };
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
    case "finish":
      if (winnerSide === "east") {
        return {
          east: {
            pos: { x: lerp(0.53, 0.56, p), y: lerp(0.5, 0.49, p) },
            rotation: 4,
            scale: 1.16,
            bodyPhase: "throwing",
            opacity: 1,
          },
          west: {
            pos: { x: lerp(0.67, 0.8, p), y: lerp(0.52, 0.63, p) },
            rotation: lerp(-18, -65, p),
            scale: lerp(0.96, 0.72, p),
            bodyPhase: "falling",
            opacity: lerp(1, 0.75, p),
          },
        };
      }
      return {
        east: {
          pos: { x: lerp(0.33, 0.2, p), y: lerp(0.52, 0.63, p) },
          rotation: lerp(18, 65, p),
          scale: lerp(0.96, 0.72, p),
          bodyPhase: "falling",
          opacity: lerp(1, 0.75, p),
        },
        west: {
          pos: { x: lerp(0.47, 0.44, p), y: lerp(0.5, 0.49, p) },
          rotation: -4,
          scale: 1.16,
          bodyPhase: "throwing",
          opacity: 1,
        },
      };
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
