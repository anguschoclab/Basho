/**
 * ArchetypeAdaptation.ts
 * ======================
 * Canon §§8–11: archetype-scaled reaction lag, confirmation gating, and
 * posture selection (embrace the meta vs counter-meta identity) driven by the
 * banded MetaPerception from MetaPerception.ts.
 *
 * All reads are banded (no raw drift factors); all writes are world-visible
 * levers — bid family bias, recovery emphasis, scouting urgency. State lives
 * on oyakata.memory.metaAdaptation so reaction lag persists across saves.
 */

import type { WorldState, MetaHistoryEntry } from "../types/world";
import type { OyakataArchetype } from "../types/oyakata";
import type { MetaPerception, OyakataMemory } from "../ai/types";
import type { Id } from "../types/common";
import { getHeya } from "../queries";
import { buildMetaPerception } from "./MetaPerception";
import { rngFromSeed } from "../rng";
import {
  META_LAG_WEEKS,
  META_CONFIRMATIONS_REQUIRED,
  META_COUNTER_RIGIDITY_TRADITION,
  META_COUNTER_QUIRKS,
  META_BID_FAMILY_BONUS,
} from "../../constants/engine/perception";

export type MetaFamily = keyof MetaHistoryEntry["familyShares"];
export type MetaPosture = "none" | "embrace_meta" | "counter_meta";

/** Persisted on oyakata.memory — tracks the manager's meta-read over time. */
export interface MetaAdaptationState {
  /** Dominant family currently being tracked (resets on change). */
  observedFamily?: MetaFamily;
  /** Week the current observation began. */
  sinceWeek: number;
  /** Consecutive weekly confirmations of the observed family. */
  confirmations: number;
  committedPosture?: MetaPosture;
  committedFamily?: MetaFamily;
}

/** The actionable output — real levers applied to the weekly decision. */
export interface MetaAdaptation {
  posture: MetaPosture;
  /** "high" when the elevated injury climate demands recovery focus. */
  recoveryOverride?: "high";
  /** Escalate scouting one level while hunting meta/counter talent. */
  scoutingBoost?: boolean;
  /** Recruitment bias: prefer candidates of this family with a bid bonus. */
  bidFamilyBias?: { family: MetaFamily; weight: number };
  reasoning: string[];
}

const NO_ADAPTATION: MetaAdaptation = { posture: "none", reasoning: [] };

/** Canon §11 counter-meta map: which family punishes the dominant one. */
const COUNTER_FAMILY: Record<MetaFamily, MetaFamily> = {
  push: "belt", // belt grapplers neutralize pushers
  belt: "trick", // trips/throws punish committed belt men
  speed: "push", // raw pressure overwhelms lateral speed
  trick: "push", // pressure beats gimmicks
};

interface TraitInput {
  ambition?: number;
  patience?: number;
  risk?: number;
  tradition?: number;
  compassion?: number;
}

function lagWeeksFor(archetype: OyakataArchetype | string): number {
  return META_LAG_WEEKS[archetype] ?? META_LAG_WEEKS.strategist;
}

function confirmationsRequiredFor(archetype: OyakataArchetype | string): number {
  return META_CONFIRMATIONS_REQUIRED[archetype] ?? META_CONFIRMATIONS_REQUIRED.default;
}

function hasCounterMetaDisposition(
  archetype: OyakataArchetype | string,
  traits: TraitInput,
  quirks: string[]
): boolean {
  if (archetype === "traditionalist") return true;
  if ((traits.tradition ?? 0) >= META_COUNTER_RIGIDITY_TRADITION) return true;
  return quirks.some((q) => META_COUNTER_QUIRKS.has(q));
}

/** Canon §10.2: traditionalists treat a belt meta as reinforcement, not threat. */
function postureFor(
  archetype: OyakataArchetype | string,
  traits: TraitInput,
  quirks: string[],
  family: MetaFamily,
  heyaId: Id,
  week: number
): MetaPosture {
  switch (archetype) {
    case "indulgent":
      // §15 stagnation failure mode — indulgent managers never adapt.
      return "none";
    case "traditionalist":
      // Belt meta reinforces identity (§10.2); other metas draw the counter.
      return family === "belt" ? "embrace_meta" : "counter_meta";
    case "gambler": {
      // §8.2/§10: extreme embrace or extreme counter, seeded per-week.
      const rng = rngFromSeed(`meta-posture-${heyaId}-${week}`, "ai", "metaAdapt");
      return rng.next() < 0.5 ? "embrace_meta" : "counter_meta";
    }
    case "nurturer":
      // Welfare-first: lean into injury response rather than style wars.
      return "embrace_meta";
    default:
      return hasCounterMetaDisposition(archetype, traits, quirks) && family === "push"
        ? "counter_meta"
        : "embrace_meta";
  }
}

/**
 * Advance the manager's meta-adaptation state by one weekly tick.
 * Pure: consumes banded perception + persisted state, returns new state and
 * the concrete adaptation to apply this week.
 */
export function updateMetaAdaptation(
  _world: WorldState,
  memory: OyakataMemory | undefined,
  archetype: OyakataArchetype | string,
  traits: TraitInput,
  quirks: string[],
  meta: MetaPerception,
  week: number,
  heyaId: Id = "unknown"
): { state: MetaAdaptationState; adaptation: MetaAdaptation } {
  const reasoning: string[] = [];

  // ── Elevated injury climate is immediate (kyujo is public) — no lag. ──
  const injuryDriven =
    meta.injuryClimate === "elevated" &&
    (archetype === "nurturer" ||
      archetype === "strict" ||
      (traits.compassion ?? 0) >= META_COUNTER_RIGIDITY_TRADITION);

  const observed = meta.dominantFamily === "none" ? undefined : meta.dominantFamily;
  const prev = memory?.metaAdaptation;

  // Track the observed family; reset the lag clock when it changes.
  let state: MetaAdaptationState;
  if (!observed) {
    state = {
      observedFamily: undefined,
      sinceWeek: week,
      confirmations: 0,
      committedPosture: prev?.committedPosture,
      committedFamily: prev?.committedFamily,
    };
  } else if (prev?.observedFamily === observed) {
    state = { ...prev, observedFamily: observed, confirmations: prev.confirmations + 1 };
  } else {
    // New dominant family — reaction lag restarts (canon §8.1).
    state = { observedFamily: observed, sinceWeek: week, confirmations: 0 };
    reasoning.push(`[Meta] New dominant signal detected: ${observed} — reaction clock reset.`);
  }

  // ── Injury response applies regardless of style-meta commitment. ──
  let recoveryOverride: MetaAdaptation["recoveryOverride"];
  if (injuryDriven) {
    recoveryOverride = "high";
    reasoning.push("[Meta] Elevated injury climate — prioritizing recovery.");
  }

  // ── Lag + confirmation gate (§8.1–8.2). ──
  const elapsed = week - state.sinceWeek;
  const lagOk = elapsed >= lagWeeksFor(archetype);
  const confirmed = state.confirmations >= confirmationsRequiredFor(archetype);

  // Gambler exception: may act on "emerging" band (short-window noise);
  // all others require an established dominance signal.
  const magnitudeOk =
    meta.dominanceBand === "established" ||
    (archetype === "gambler" && meta.dominanceBand === "emerging");

  if (!observed || !lagOk || !confirmed || !magnitudeOk) {
    if (observed && !lagOk) {
      reasoning.push(
        `[Meta] Watching ${observed} dominance — lag ${elapsed}/${lagWeeksFor(archetype)}w.`
      );
    }
    // Preserve an existing commitment only while its signal still holds.
    if (observed && prev?.committedPosture && prev.committedFamily === observed && magnitudeOk) {
      return {
        state,
        adaptation: adaptationForPosture(prev.committedPosture, observed, recoveryOverride, reasoning),
      };
    }
    return { state, adaptation: { ...NO_ADAPTATION, recoveryOverride, reasoning } };
  }

  // ── Commit a posture. ──
  const posture = postureFor(archetype, traits, quirks, observed, heyaId, week);
  state.committedPosture = posture;
  state.committedFamily = observed;
  reasoning.push(
    `[Meta] Committed ${posture} on ${observed} meta after ${elapsed}w (${archetype}).`
  );

  return {
    state,
    adaptation: adaptationForPosture(posture, observed, recoveryOverride, reasoning),
  };
}

function adaptationForPosture(
  posture: MetaPosture,
  observed: MetaFamily,
  recoveryOverride: MetaAdaptation["recoveryOverride"],
  reasoning: string[]
): MetaAdaptation {
  if (posture === "none") return { ...NO_ADAPTATION, recoveryOverride, reasoning };

  const target = posture === "counter_meta" ? COUNTER_FAMILY[observed] : observed;
  return {
    posture,
    recoveryOverride,
    scoutingBoost: posture === "counter_meta",
    bidFamilyBias: { family: target, weight: META_BID_FAMILY_BONUS },
    reasoning,
  };
}

/**
 * Full evaluation entry point for the weekly NPC phase: derives perception
 * from world state, reads the oyakata's persisted adaptation state, and
 * returns the new state + levers to apply.
 */
export function evaluateAdaptation(
  world: WorldState,
  heyaId: Id
): { state: MetaAdaptationState; adaptation: MetaAdaptation } {
  const heya = getHeya(world, heyaId);
  const oyakata = heya?.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
  const meta = buildMetaPerception(world);

  if (!oyakata) {
    return {
      state: { sinceWeek: world.week, confirmations: 0 },
      adaptation: NO_ADAPTATION,
    };
  }

  return updateMetaAdaptation(
    world,
    oyakata.memory,
    oyakata.archetype,
    oyakata.traits ?? {},
    oyakata.quirks ?? [],
    meta,
    world.week,
    heyaId
  );
}
