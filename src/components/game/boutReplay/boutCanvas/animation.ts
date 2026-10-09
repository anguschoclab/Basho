import type { ReplayPhase, RikishiState, BodyPhase } from "./types";
import type { BoutScript, BoutAnimationFamily } from "@/presenters/engineAccess";
import { lerp, easeOut, easeInOut } from "./math";
import {
  ritualTarget,
  tachiaiTarget,
  clinchTarget,
  momentumTarget,
  finishTarget,
  ceremonyTarget,
  defaultTarget,
} from "./targetStates";

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
      return ritualTarget(p01);
    case "tachiai":
      return tachiaiTarget(p, script);
    case "clinch":
      return clinchTarget(script);
    case "momentum":
      return momentumTarget(p, pe, winnerSide);
    case "finish":
      return finishTarget(p, winnerSide, script);
    case "ceremony":
      return ceremonyTarget(winnerSide);
    default:
      return defaultTarget();
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
