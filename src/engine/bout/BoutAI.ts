/**
 * BoutAI.ts
 * =========
 * Context-aware CPU bout tactic selection. Wraps the original style/roll based
 * `determineCPUTactic` and adds opponent modelling, fatigue, and rank-pressure
 * adjustments without disturbing the tactical clash rules.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutTactic } from "../types/combat";
import type { SeededRNG } from "../rng";
import { decideBoutTacticOverride } from "../strategy/NPCStrategyService";
import type { OpponentTacticModel } from "../ai/types";
import {
  TACTIC_YOTSU_BELT_THRESHOLD,
  TACTIC_YOTSU_STANDARD_THRESHOLD,
  TACTIC_YOTSU_OSHI_THRESHOLD,
  TACTIC_OSHI_THRUST_THRESHOLD,
  TACTIC_OSHI_STANDARD_THRESHOLD,
  TACTIC_OSHI_YOTSU_THRESHOLD,
  TACTIC_HYBRID_YOTSU_THRESHOLD,
  TACTIC_HYBRID_OSHI_THRESHOLD,
  TACTIC_HYBRID_STANDARD_THRESHOLD,
} from "../../constants/engine/generation";

export interface BoutAIContext {
  bashoDay?: number;
  rng: SeededRNG;
  /** CPU's current basho record. */
  cpuRecord?: { wins: number; losses: number };
  /** Heat from an active rivalry, if any. */
  rivalryHeat?: number;
  /** CPU fatigue (0-100). */
  fatigue?: number;
  /** Opponent fatigue (0-100). */
  opponentFatigue?: number;
  /** Learned model of the opponent's tactics. */
  opponentModel?: OpponentTacticModel;
  /** Pressure inferred from rank/record context. */
  rankPressure?: "demotion" | "promotion" | "neutral";
}

/**
 * Original style/roll based CPU tactic selection.
 * Extracted here so BoutAI and the legacy `determineCPUTactic` share the same
 * base implementation deterministically.
 */
export function chooseBaseTactic(cpu: Rikishi, rng: SeededRNG): BoutTactic {
  const isYotsu = cpu.style === "yotsu";
  const isOshi = cpu.style === "oshi";
  const tech = cpu.stats?.technique ?? 50;
  const speed = cpu.stats?.speed ?? 50;
  const canNekodamashi = tech > 65 && speed > 65;

  const roll = rng.next();

  if (isYotsu) {
    if (canNekodamashi && roll >= 0.95) return "NEKODAMASHI";
    if (roll < TACTIC_YOTSU_BELT_THRESHOLD) return "YOTSU_BELT";
    if (roll < TACTIC_YOTSU_STANDARD_THRESHOLD) return "STANDARD";
    if (roll < TACTIC_YOTSU_OSHI_THRESHOLD) return "OSHI_THRUST";
    return "HENKA";
  } else if (isOshi) {
    if (canNekodamashi && roll >= 0.95) return "NEKODAMASHI";
    if (roll < TACTIC_OSHI_THRUST_THRESHOLD) return "OSHI_THRUST";
    if (roll < TACTIC_OSHI_STANDARD_THRESHOLD) return "STANDARD";
    if (roll < TACTIC_OSHI_YOTSU_THRESHOLD) return "YOTSU_BELT";
    return "HENKA";
  } else {
    // Hybrid / Other
    if (roll < TACTIC_HYBRID_YOTSU_THRESHOLD) return "YOTSU_BELT";
    if (roll < TACTIC_HYBRID_OSHI_THRESHOLD) return "OSHI_THRUST";
    if (roll < TACTIC_HYBRID_STANDARD_THRESHOLD) return "STANDARD";
    return "HENKA";
  }
}

const INTENSITY_TACTICS: BoutTactic[] = ["ALL_OUT", "OSHI_THRUST", "YOTSU_BELT"];
const DEFENSIVE_TACTICS: BoutTactic[] = ["DEFENSIVE_PULL", "HENKA", "STANDARD"];

function isHighFatigue(fatigue?: number): boolean {
  return fatigue !== undefined && fatigue > 70;
}

function isLowFatigue(fatigue?: number): boolean {
  return fatigue !== undefined && fatigue < 30;
}

/**
 * Choose the CPU tactic for a bout.
 * First applies the existing high-pressure override, then the base style/roll
 * tactic, then makes deterministic adjustments from opponent model, fatigue,
 * and rank pressure.
 */
export function chooseTactic(
  cpu: Rikishi,
  opponent: Rikishi | undefined,
  ctx: BoutAIContext
): BoutTactic {
  // 1. High-pressure override (rivalry, kachi/make-koshi precipice).
  if (ctx.cpuRecord && ctx.bashoDay !== undefined) {
    const override = decideBoutTacticOverride(ctx.cpuRecord, ctx.rivalryHeat ?? 0, ctx.bashoDay);
    if (override) {
      // Avoid ALL_OUT if the CPU is exhausted unless it is the final-day make-koshi precipice.
      if (
        override === "ALL_OUT" &&
        isHighFatigue(ctx.fatigue) &&
        !(ctx.bashoDay === 15 && ctx.cpuRecord.losses === 8)
      ) {
        // fall through to contextual selection
      } else {
        return override;
      }
    }
  }

  // 2. Base style/roll tactic.
  let tactic = chooseBaseTactic(cpu, ctx.rng);

  // 3. Opponent-model counter.
  if (ctx.opponentModel && opponent) {
    const dominantFamily = getDominantFamily(ctx.opponentModel);
    const counter = counterForFamily(dominantFamily);
    // If the base tactic does not counter the opponent's dominant family and
    // the CPU has the adaptability/speed to switch, nudge toward the counter.
    if (tactic !== counter && canExecuteTactic(cpu, counter)) {
      // Adopt the counter-tactic deterministically. The original roll still
      // governs the base tactic, keeping overall determinism intact.
      tactic = counter;
    }
  }

  // 4. Fatigue adjustments.
  if (isHighFatigue(ctx.fatigue) && INTENSITY_TACTICS.includes(tactic)) {
    // Exhausted rikishi fall back to a less demanding tactic.
    tactic = "STANDARD";
  }
  if (isLowFatigue(ctx.opponentFatigue) && DEFENSIVE_TACTICS.includes(tactic)) {
    // A fresh opponent is harder to trick; play standard instead.
    tactic = "STANDARD";
  }

  // 5. Rank pressure.
  if (ctx.rankPressure === "demotion" && tactic === "ALL_OUT") {
    tactic = "DEFENSIVE_PULL";
  }
  if (ctx.rankPressure === "promotion" && tactic === "HENKA") {
    // Promotion runs avoid the crowd-disliked henka unless desperate.
    tactic = "OSHI_THRUST";
  }

  return tactic;
}

function getDominantFamily(model: OpponentTacticModel): "push" | "belt" | "trick" | "speed" {
  const entries = Object.entries(model.familyCounts) as [
    "push" | "belt" | "trick" | "speed",
    number,
  ][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "push";
}

function counterForFamily(family: "push" | "belt" | "trick" | "speed"): BoutTactic {
  switch (family) {
    case "push":
      return "YOTSU_BELT"; // belt counters push
    case "belt":
      return "HENKA"; // trick counters belt
    case "trick":
      return "OSHI_THRUST"; // push counters trick
    case "speed":
      return "YOTSU_BELT"; // belt nullifies speed angles
    default:
      return "STANDARD";
  }
}

function canExecuteTactic(cpu: Rikishi, tactic: BoutTactic): boolean {
  const stats = cpu.stats;
  switch (tactic) {
    case "OSHI_THRUST":
      return (stats?.power ?? 50) >= 40;
    case "YOTSU_BELT":
      return (stats?.technique ?? 50) >= 40;
    case "HENKA":
      return (stats?.speed ?? 50) >= 40;
    default:
      return true;
  }
}

/**
 * Backwards-compatible wrapper that preserves the original `determineCPUTactic`
 * signature. Used by callers that only have the CPU rikishi and RNG.
 */
export function chooseTacticForCPU(cpu: Rikishi, rng: SeededRNG): BoutTactic {
  return chooseTactic(cpu, undefined, { rng });
}
