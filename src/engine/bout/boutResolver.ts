/**
 * src/engine/bout/boutResolver.ts
 * ================================
 * Bout Resolver
 *
 * Responsibilities:
 * - Resolve bout results using spatial physics engine
 * - Apply rivalry modifiers to rikishi stats
 * - Detect kinboshi and ginboshi achievements
 * - Generate bout narrative
 * - Update rivalry state
 * - Calculate kensho (prize banners)
 * - Handle fusensho (walkover) scenarios
 *
 * @see boutPhysics for spatial physics engine
 * @see boutNarrative for narrative generation
 * @see RivalryService for rivalry updates
 */

import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Side } from "@/engine/types/banzuke";
// We import the B+ spatial physics runner
import { resolveBoutPhysics, conditionMultiplier } from "@/engine/bout/boutPhysics";
import { RivalryService } from "@/engine/narrative/RivalryService";

import { clamp } from "@/engine/utils/math";
import type { BoutTactic } from "@/engine/types/combat";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { resolveSideTactics } from "@/engine/bout/resolution/tactics";
import { applyOfficiating } from "@/engine/bout/resolution/officiating";
import { enrichResult, applyTacticAftermath } from "@/engine/bout/resolution/enrichment";
import { applyStakesAndKensho } from "@/engine/bout/resolution/stakes";
import {
  assignGyojiAndResolveVerdict,
  recordGyojiAftermath,
} from "@/engine/bout/resolution/gyoji";
import { applyMonoiiVerdict } from "@/engine/bout/resolution/monoiiVerdict";
import { rollMissedCallReview } from "@/engine/bout/resolution/missedCall";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { hometownTier, applyHometownBonus } from "@/engine/basho/geography";
import { applyDohyoCondition } from "@/engine/basho/dohyo";
import { BASHO_CALENDAR } from "@/engine/calendar/calendar";
import {
  RIVALRY_HEAT_AGGRESSION_MULTIPLIER,
  RIVALRY_SPITE_MENTAL_MULTIPLIER,
  DEFAULT_DAY,
  DEFAULT_BASHO_NUMBER,
  RIVALRY_NORMALIZATION_DIVISOR,
  STAT_CLAMP_MIN,
  STAT_CLAMP_MAX,
} from "@/constants/engine/physics";
import { DEFAULT_YEAR } from "@/constants/engine/calendar";
import { DEFAULT_STAT_VALUE } from "@/constants/engine/rikishi";

// Phase 8 complete: kimariteClassifier.ts owns all kimarite selection.
// kimariteEvaluator.ts has been deleted.
// Contention, achievement, and tactic aftermath logic extracted to dedicated modules.

/**
 * Canonical absence gate (W0 harmonization): a rikishi is absent from a bout
 * iff he has withdrawn (`isKyujo`) or retired (`isRetired`). `injured` alone
 * is NOT absence — an injured rikishi who has not withdrawn competes through
 * the injury (see morningOfDay / competing-injury penalties).
 */
export function absentRikishi(r: Rikishi): boolean {
  return !!(r.isRetired || r.isKyujo);
}

/**
 * Pre-physics fusensho check.
 * If either rikishi is absent (kyujo/retired), return a walkover result
 * immediately without running the physics simulation.
 */
function tryFusensho(bout: BoutContext, east: Rikishi, west: Rikishi): BoutResult | null {
  const eastAbsent = absentRikishi(east);
  const westAbsent = absentRikishi(west);

  if (!eastAbsent && !westAbsent) return null;

  // Double fusenpai: both rikishi absent — there is no legitimate winner.
  // `winner` stays typed (Side) but `winnerRikishiId`/`loserRikishiId` are
  // left empty; consumers guard on the empty winner id.
  if (eastAbsent && westAbsent) {
    return {
      boutId: bout.id,
      day: bout.day,
      winner: "east",
      winnerRikishiId: "",
      loserRikishiId: "",
      kimarite: "fusensho",
      kimariteName: "Fusenshō",
      stance: "no-grip",
      tachiaiWinner: "east",
      duration: 0,
      excitementScore: 0,
      upset: false,
      isKinboshi: false,
      log: [{ phase: "finish", data: { event: "fusensho", doubleAbsent: true } }],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    };
  }

  const winnerSide: Side = westAbsent ? "east" : "west";
  const winner = winnerSide === "east" ? east : west;
  const loser = winnerSide === "east" ? west : east;

  return {
    boutId: bout.id,
    day: bout.day,
    winner: winnerSide,
    winnerRikishiId: winner.id,
    loserRikishiId: loser.id,
    kimarite: "fusensho",
    kimariteName: "Fusensh\u014d",
    stance: "no-grip",
    tachiaiWinner: winnerSide,
    duration: 0,
    excitementScore: 0,
    upset: false,
    isKinboshi: false,
    log: [{ phase: "finish", data: { event: "fusensho", absent: loser.id } }],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  };
}

/**
 * Resolve a bout between two rikishi.
 * Main orchestrator for bout resolution using spatial physics engine.
 *
 * Algorithm:
 * 1. Check for fusensho (walkover) if either rikishi is injured/retired
 * 2. Apply rivalry modifiers to rikishi stats (aggression, mental)
 * 3. Determine NPC tactic override for key days
 * 4. Run B+ spatial physics engine to resolve bout
 * 5. Generate narrative based on data frames
 * 6. Detect kinboshi and ginboshi achievements
 * 7. Apply henka prestige penalty
 * 8. Update rivalry state
 * 9. Calculate kensho (prize banners) and envelopes
 *
 * @param {BoutContext} bout - The bout context.
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {BashoState} basho - Current basho state.
 * @param {import("@/engine/types/combat").BoutTactic} [playerTactic] - Player tactic override.
 * @param {WorldState} [world] - World state for rivalry and kensho data.
 * @returns {{ result: BoutResult; impact: StateImpact }} Bout result and state impact.
 *
 * @example
 * ```ts
 * const { result, impact } = resolveBout(bout, east, west, basho, playerTactic, world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function resolveBout(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState,
  playerTactic?: BoutTactic,
  world?: WorldState
): { result: BoutResult; impact: StateImpact } {
  const builder = createImpactBuilder("resolveBout");

  // 0. Fusensho — injured/retired rikishi cannot fight; opponent wins by walkover
  const fusenshoResult = tryFusensho(bout, east, west);
  if (fusenshoResult) return { result: fusenshoResult, impact: builder.build() };

  // --- PHASE 3: RIVALRY CONNECTIVITY ---
  let eastRivalry = { heat: 0, spite: 0 };
  let westRivalry = { heat: 0, spite: 0 };

  if (world) {
    const rivalryState = RivalryService.ensureRivalriesState(world);
    const rivalryKey = RivalryService.makeRivalryKey(east.id, west.id);
    const pair = rivalryState.pairs[rivalryKey];

    if (pair) {
      eastRivalry = { heat: pair.heat, spite: pair.spite };
      westRivalry = { heat: pair.heat, spite: pair.spite };
    }
  }

  const { eastBout, westBout } = buildBoutClones(east, west, eastRivalry, westRivalry, basho);

  const { eastTactic, westTactic, ctxFinal } = resolveSideTactics(
    bout,
    east,
    west,
    basho,
    playerTactic,
    world,
    eastRivalry.heat
  );

  // 1. Run B+ spatial physics engine
  const meta = world?.meta;
  const { result: physicsResult } = resolveBoutPhysics(
    ctxFinal,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    meta
  );

  // 1.5/1.6. Kinjite disqualification + scandal + yaocho detection
  const { result: officiatedResult } = applyOfficiating(
    bout,
    physicsResult,
    eastBout as Rikishi,
    westBout as Rikishi,
    basho,
    eastTactic,
    westTactic,
    world,
    builder
  );

  // 1.7. Missed-call review — the shimpan panel proactively catches calls
  // the gyoji got wrong (hiwaza/close-edge finishes), even when physics
  // flagged no controversy.
  rollMissedCallReview(officiatedResult, world, `${basho.id ?? "basho"}-${bout.id}`);
  if (officiatedResult.monoii && !officiatedResult.foulReview) {
    officiatedResult.monoiiKind ??= "contested";
  }

  // 1.8. Gyoji assignment + mono-ii verdict — BEFORE enrichment so
  // achievements, standings, h2h, and kensho all see the final result.
  // Importance is graded on rank/day, not post-hoc stakes flags.
  const { gyoji, panel } = assignGyojiAndResolveVerdict(
    world,
    officiatedResult,
    bout,
    east,
    west
  );

  // 1.9. Apply the verdict — a sashichigae flips the winner; a torinaoshi
  // re-runs the bout under a salted basho id and only the rematch counts.
  const { result } = applyMonoiiVerdict({
    bout,
    ctxFinal,
    result: officiatedResult,
    east,
    west,
    eastBout: eastBout as Rikishi,
    westBout: westBout as Rikishi,
    basho,
    eastTactic,
    westTactic,
    world,
    builder,
    meta,
    gyoji,
    panel,
  });

  const winner = result.winner === "east" ? east : west;
  const loser = result.winner === "east" ? west : east;

  // 2. Achievements, career highlights, dramatic context
  enrichResult(bout, result, winner, loser, basho, world, builder);

  // 3. Tactic aftermath (fatigue, momentum, injury multiplier) — per side.
  applyTacticAftermath(bout, result, east, west, eastTactic, westTactic, builder);

  // 4/5. Title stakes, rivalry update, kimarite stats, kensho
  applyStakesAndKensho(world, east, west, winner, result, bout, basho, builder);

  // 6. Record officiating career stats on the FINAL result — a torinaoshi
  // counts as two officiated bouts.
  recordGyojiAftermath(world, result, basho, builder, gyoji, panel);

  // 7. Narrative — LAST so commentary sees the recorded outcomes
  //    (monoiiOutcome, gyojiId, isYushoRace/isTitleStakes) instead of
  //    re-rolling its own. Previously generated inside enrichResult
  //    before officiation resolved the mono-ii (V18-O1).
  generateBoutNarrative(
    result,
    east,
    west,
    (basho.bashoName ?? basho.name) as BashoName | undefined,
    bout.day,
    `${result.boutId}-pbp`,
    world || ({} as WorldState)
  );

  return { result, impact: builder.build() };
}

/**
 * Build the bout clones — every bout-only modifier layers here, in order:
 * rivalry heat/spite → competing-injury penalty → hometown crowd bonus →
 * venue clay condition. The originals are never touched.
 */
function buildBoutClones(
  east: Rikishi,
  west: Rikishi,
  eastRivalry: { heat: number; spite: number },
  westRivalry: { heat: number; spite: number },
  basho: BashoState
): { eastBout: Rikishi; westBout: Rikishi } {
  const bashoLocation = basho.bashoName ? BASHO_CALENDAR[basho.bashoName]?.location : undefined;
  const cloneFor = (r: Rikishi, rivalry: { heat: number; spite: number }) =>
    applyDohyoCondition(
      applyHometownBonus(
        applyCompetingInjuryPenalty(applyRivalryToRikishi(r, rivalry)),
        hometownTier(r.origin, bashoLocation)
      ),
      basho.dohyoCondition
    );
  return {
    eastBout: cloneFor(east, eastRivalry),
    westBout: cloneFor(west, westRivalry),
  };
}

/**
 * Applies temporary bout-only modifiers to a cloned rikishi:
 * - rivalry heat   → boosts aggression (up to +15%)
 * - rivalry spite  → boosts mental (up to +20%)
 * - condition      → scales power/speed/technique/balance/stamina (0.8–1.0×)
 *
 * @param {Rikishi} r - The rikishi to modify.
 * @param {{ heat: number; spite: number }} rivalry - Rivalry heat and spite values.
 * @returns {Rikishi} Cloned rikishi with bout-only modifiers applied.
 *
 * @example
 * ```ts
 * const eastBout = applyRivalryToRikishi(east, { heat: 50, spite: 30 });
 * const westBout = applyRivalryToRikishi(west, { heat: 50, spite: 30 });
 * ```
 */
export function applyRivalryToRikishi(
  r: Rikishi,
  rivalry: { heat: number; spite: number }
): Rikishi {
  const heat01 = rivalry.heat / RIVALRY_NORMALIZATION_DIVISOR;
  const spite01 = rivalry.spite / RIVALRY_NORMALIZATION_DIVISOR;
  const condMult = conditionMultiplier(r.condition ?? 100);
  return {
    ...r,
    stats: {
      ...r.stats,
      aggression: clamp(
        (r.stats.aggression ?? DEFAULT_STAT_VALUE) *
          (1 + heat01 * RIVALRY_HEAT_AGGRESSION_MULTIPLIER),
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      mental: clamp(
        (r.stats.mental ?? DEFAULT_STAT_VALUE) * (1 + spite01 * RIVALRY_SPITE_MENTAL_MULTIPLIER),
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      power: clamp(
        (r.stats.power ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      speed: clamp(
        (r.stats.speed ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      technique: clamp(
        (r.stats.technique ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      balance: clamp(
        (r.stats.balance ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
      stamina: clamp(
        (r.stats.stamina ?? DEFAULT_STAT_VALUE) * condMult,
        STAT_CLAMP_MIN,
        STAT_CLAMP_MAX
      ),
    },
  };
}

/**
 * Competing-injury penalty (W A): a rikishi who stays entered while hurt
 * carries a severity × area stat debuff into the bout. The penalty is
 * targeted — a taped ankle costs balance and speed, a bad shoulder costs
 * power and technique — plus a small mental toll everywhere.
 *
 * Severity scale: minor 6% / moderate 14% / serious 25% on the targeted
 * stats. Applied to the bout clone; world state is untouched.
 */
export function applyCompetingInjuryPenalty(r: Rikishi): Rikishi {
  if (!r.injured) return r;
  const severity = r.injuryStatus?.severity ?? "moderate";
  const base = severity === "serious" ? 0.25 : severity === "moderate" ? 0.14 : 0.06;
  const area = r.injuryStatus?.location ?? r.currentInjury?.area ?? "other";
  const debuff = (v: number | undefined, p: number) =>
    clamp((v ?? DEFAULT_STAT_VALUE) * (1 - p), STAT_CLAMP_MIN, STAT_CLAMP_MAX);

  const lowerBody = area === "knee" || area === "ankle" || area === "hip";
  const upperBody = area === "shoulder" || area === "elbow" || area === "wrist" || area === "rib";
  const core = area === "back" || area === "neck";

  const stats = { ...r.stats };
  if (lowerBody) {
    stats.balance = debuff(stats.balance, base);
    stats.speed = debuff(stats.speed, base);
  } else if (upperBody) {
    stats.power = debuff(stats.power, base);
    stats.technique = debuff(stats.technique, base);
  } else if (core) {
    stats.power = debuff(stats.power, base);
    stats.balance = debuff(stats.balance, base);
  } else {
    const half = base / 2;
    stats.power = debuff(stats.power, half);
    stats.speed = debuff(stats.speed, half);
    stats.technique = debuff(stats.technique, half);
    stats.balance = debuff(stats.balance, half);
  }
  // Hurt rikishi fight with doubt — small mental cost regardless of area.
  stats.mental = debuff(stats.mental, base / 2);
  return { ...r, stats };
}

/**
 * Simulate a bout between two rikishi without affecting world state.
 * Creates a fake basho context and resolves the bout for simulation purposes.
 *
 * @param {Rikishi} east - East rikishi.
 * @param {Rikishi} west - West rikishi.
 * @param {string} seed - Seed for deterministic simulation.
 * @returns {BoutResult} The bout result.
 *
 * @example
 * ```ts
 * const result = simulateBout(east, west, "simulation-seed");
 * console.log(result.winner, result.kimarite);
 * ```
 */
export function simulateBout(east: Rikishi, west: Rikishi, seed: string): { result: BoutResult } {
  const fakeBasho: BashoState = {
    // Fold the caller's seed into the basho id so it actually reaches the physics
    // RNG (resolveBoutPhysics seeds from basho.id + day + rikishi ids). Without
    // this the `seed` arg only set bout.id and every call with the same two
    // rikishi produced an identical bout.
    id: `sim-${seed}`,
    year: DEFAULT_YEAR,
    day: DEFAULT_DAY,
    bashoName: "hatsu",
    bashoNumber: DEFAULT_BASHO_NUMBER,
    matches: [],
    standings: new Map(),
    isActive: false,
  };
  const bout: BoutContext = {
    id: `sim-${seed}`,
    day: DEFAULT_DAY,
    rikishiEastId: east.id,
    rikishiWestId: west.id,
  };
  const { result } = resolveBout(bout, east, west, fakeBasho);
  return { result };
}
