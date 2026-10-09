import type { WorldState } from "../../../types/world";
import type { Rikishi } from "../../../types/rikishi";
import type { RivalryTone } from "../../../../constants/engine/rivalry";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { EntityCollection } from "../../../core/EntityCollection";
import { RNGRegistry } from "../../../core/RNGRegistry";
import { createImpactBuilder } from "../../../core/ImpactBuilder";
import type { StateImpact } from "../../../core/StateImpact";
import type { SparringChemistry } from "../../../types/training";
import {
  TOP_RIVALRY_PAIRS_TO_SEED,
  NATIONALITY_RIVALRY_BONUS,
} from "../../../../constants/engine/narrative";
import {
  RANK_DIFF_BONUS_BASE,
  RANK_DIFF_BONUS_MULTIPLIER,
  RANK_DIFF_MAX,
  RIVALRY_RNG_THRESHOLD,
  STYLE_CLASH_BONUS,
  SAME_DIVISION_BONUS,
  AGE_PROXIMITY_BONUS_BASE,
  AGE_PROXIMITY_MULTIPLIER,
  AGE_PROXIMITY_MAX_DIFF,
  RIVALRY_INITIAL_HEAT_MIN,
  RIVALRY_INITIAL_HEAT_MAX,
  SPARRING_RIVALRY_WEEKS_THRESHOLD,
  SPARRING_INITIAL_HEAT_MIN,
  SPARRING_INITIAL_HEAT_MAX,
} from "../../../../constants/engine/rivalry";
import { getRikishi } from "../../../queries";
import { ensureRivalriesState, makeRivalryKey, createFreshPair } from "./state";

/**
 * Seed Initial Rivalries (P0-C1).
 * Generates interesting initial grudges based on style clash and rank proximity.
 */
export function seedInitialRivalries(world: WorldState): StateImpact {
  const builder = createImpactBuilder("seedInitialRivalries");
  const state = ensureRivalriesState(world);
  const makuuchiJuryo: Rikishi[] = [];
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r && isSekitoriDivision(r.division)) {
      makuuchiJuryo.push(r);
    }
  }

  const candidates: Array<{ a: Rikishi; b: Rikishi; score: number }> = [];

  // Evaluate pairs
  for (let i = 0; i < makuuchiJuryo.length; i++) {
    for (let j = i + 1; j < makuuchiJuryo.length; j++) {
      const a = makuuchiJuryo[i];
      const b = makuuchiJuryo[j];

      if (a.heyaId === b.heyaId) continue;

      let score = 0;
      // Style clash: Push vs Belt is classic
      if (a.style !== b.style) score += STYLE_CLASH_BONUS;

      // Origin or Nationality clash
      if (a.nationality !== b.nationality) score += NATIONALITY_RIVALRY_BONUS;

      // Rank proximity (same division, close rank numbers)
      if (a.division === b.division) {
        score += SAME_DIVISION_BONUS;
        const rankDiff = Math.abs((a.rankNumber ?? 1) - (b.rankNumber ?? 1));
        if (rankDiff <= RANK_DIFF_MAX)
          score += RANK_DIFF_BONUS_BASE - rankDiff * RANK_DIFF_BONUS_MULTIPLIER;
      }

      // Age proximity
      const ageDiff = Math.abs(a.birthYear - b.birthYear);
      if (ageDiff <= AGE_PROXIMITY_MAX_DIFF)
        score += AGE_PROXIMITY_BONUS_BASE - ageDiff * AGE_PROXIMITY_MULTIPLIER;

      candidates.push({ a, b, score });
    }
  }

  // Sort descending by score
  candidates.sort((c1, c2) => c2.score - c1.score);

  // Seed top pairs
  const toSeed = candidates.slice(0, TOP_RIVALRY_PAIRS_TO_SEED);
  const rng = RNGRegistry.getSystemRNG(world, "rivalry", `init`);

  const nextPairs = { ...state.pairs };
  for (const { a, b } of toSeed) {
    const key = makeRivalryKey(a.id, b.id);
    const pair = createFreshPair(a.id, b.id, world);
    pair.heat = rng.int(RIVALRY_INITIAL_HEAT_MIN, RIVALRY_INITIAL_HEAT_MAX); // Warm heat
    pair.tone = rng.pick(["grudge", "bad_blood", "public_hype", "respect"]);
    nextPairs[key] = pair;
  }

  builder.updateWorldField("rivalriesState", {
    ...state,
    pairs: nextPairs,
  });

  return builder.build();
}

/**
 * Seed a rivalry from extended sparring partnership.
 * Called when a sparring pair reaches 12+ weeks of activity.
 * Uses RNG to determine if a rivalry should be seeded (40% chance).
 */
export function maybeSeedSparringRivalry(
  world: WorldState,
  aId: string,
  bId: string,
  chemistry: SparringChemistry,
  weeksActive: number
): StateImpact {
  const builder = createImpactBuilder("maybeSeedSparringRivalry");

  // Only friction pairs can seed rivalries
  if (chemistry !== "friction") return builder.build();

  // Only seed after 12+ weeks of sparring
  if (weeksActive < SPARRING_RIVALRY_WEEKS_THRESHOLD) return builder.build();

  const state = ensureRivalriesState(world);
  const key = makeRivalryKey(aId, bId);

  // Don't seed if rivalry already exists
  if (state.pairs[key]) return builder.build();

  // 40% chance to seed rivalry
  const rng = RNGRegistry.getSystemRNG(world, "rivalry", `sparring-${key}-${weeksActive}`);
  if (rng.next() > RIVALRY_RNG_THRESHOLD) return builder.build();

  // Get rikishi for event logging
  const rA = EntityCollection.getRikishiById(world, aId);
  const rB = EntityCollection.getRikishiById(world, bId);
  if (!rA || !rB) return builder.build();

  const initialHeat = rng.int(SPARRING_INITIAL_HEAT_MIN, SPARRING_INITIAL_HEAT_MAX);

  // Determine tone — only friction pairs reach this point (early return above)
  const tone: RivalryTone = rng.pick(["grudge", "bad_blood", "public_hype"]);

  // Create new rivalry pair
  const pair = createFreshPair(aId, bId, world);
  pair.heat = initialHeat;
  pair.tone = tone;
  pair.triggers.sparring = weeksActive;

  // Update rivalry state
  const updatedPairs = { ...state.pairs };
  updatedPairs[key] = pair;

  builder.updateWorldField("rivalriesState", {
    ...state,
    pairs: updatedPairs,
  });

  // Log event
  builder.logEvent(
    "SPARRING_RIVALRY_SEEDED",
    "rivalry",
    {
      shikona: rA.shikona,
      rival: rB.shikona,
      chemistry,
      weeksActive,
      heat: initialHeat,
      tone,
    },
    { importance: "notable" }
  );

  return builder.build();
}
