import { rngForWorld } from "./rng";
import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import { generateShikona } from "./shikona";
import type { CareerSnapshot } from "./types/history";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { getHeya, getRikishi } from "./queries";
import {
  CAREER_WIN_MILESTONE_THRESHOLDS,
  SHIKONA_CHANGE_BASE_PROBABILITY,
  SHIKONA_CHANGE_PROBABILITY_TRADITIONALIST,
  SHIKONA_CHANGE_PROBABILITY_TYRANT,
  SHIKONA_CHANGE_PROBABILITY_NURTURER,
  SHIKONA_CHANGE_PROBABILITY_SCIENTIST,
  SHIKONA_CHANGE_SANYAKU_BONUS,
} from "../constants/engine/generation";

/**
 * Generates a career snapshot for a Rikishi based on their current state and the last basho's results.
 */
export function generateCareerSnapshot(world: WorldState, rikishi: Rikishi): CareerSnapshot {
  const lastBasho = world.history.length > 0 ? world.history[world.history.length - 1] : undefined;

  const rng = rngForWorld(
    world,
    "history",
    `career_${rikishi.id}_${world.year}_${world.currentBashoName}`
  );
  const bashoId = lastBasho
    ? lastBasho.id
    : `${world.year}-${world.currentBashoName || "Honbasho"}`;

  return {
    id: rng.uuid("CH"),
    bashoId,

    year: world.year,
    month: world.calendar?.month ?? 1,
    bashoName: world.currentBashoName || "Honbasho",

    rank: rikishi.rank,
    division: rikishi.division,
    rankNumber: rikishi.rankNumber ?? 1,
    side: rikishi.side,

    wins: rikishi.currentBashoWins ?? 0,
    losses: rikishi.currentBashoLosses ?? 0,
    absences: 0, // Engine doesn't track absences yet

    isYusho: lastBasho?.yusho === rikishi.id,
    isJunYusho: lastBasho?.junYusho?.includes(rikishi.id) || false,
    specialPrizes: {
      shukunsho: lastBasho?.shukunsho === rikishi.id,
      kantosho: lastBasho?.kantosho === rikishi.id,
      ginosho: lastBasho?.ginoSho === rikishi.id,
    },

    weight: rikishi.weight,
    momentum: rikishi.momentum,

    totalEarningsAtBasho: rikishi.economics?.totalEarnings ?? 0,
  };
}

/**
 * Detects and records milestones for a Rikishi.
 */
export function recordMilestones(world: WorldState, rikishi: Rikishi) {
  if (!rikishi.milestones) rikishi.milestones = [];

  const year = world.year;
  const month = world.calendar?.month ?? 1;
  const lastBasho = world.history.length > 0 ? world.history[world.history.length - 1] : undefined;

  const rng = rngForWorld(world, "history", `milestone_${rikishi.id}`);

  // 1. Yusho Milestone
  if (lastBasho?.yusho === rikishi.id) {
    rikishi.milestones.push({
      id: rng.uuid("ML"),
      type: "yusho",
      title: "Tournament Champion (優勝)",
      description: `Won the ${world.currentBashoName || "basho"} with a record of ${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}.`,
      date: { year, month },
    });
  }

  // 2. Career wins milestones (100, 500, etc.)
  const wins = rikishi.careerWins || 0;
  if (CAREER_WIN_MILESTONE_THRESHOLDS.includes(wins)) {
    rikishi.milestones.push({
      id: rng.uuid("ML"),
      type: "stats_record",
      title: `${wins} Career Wins`,
      description: `Reached the landmark of ${wins} career victories.`,
      date: { year, month },
    });
  }
}

/**
 * Records milestones for all active Rikishi.
 * Returns StateImpact describing milestone updates instead of mutating state.
 *
 * NOTE: careerHistory appending is NOT done here. That is the sole
 * responsibility of publishBanzukeUpdate (which also truncates to 6).
 * The old version of this function appended a duplicate careerSnapshot,
 * causing 2 entries per basho → only 3 bashos of unique history retained
 * after the slice(-6) truncation in publishBanzukeUpdate.
 */
export function runHistoryUpdates(world: WorldState): StateImpact {
  const builder = createImpactBuilder("historyUpdates");

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;

    // Record milestones
    const milestones = rikishi.milestones || [];
    const year = world.year;
    const month = world.calendar?.month ?? 1;
    const lastBasho =
      world.history.length > 0 ? world.history[world.history.length - 1] : undefined;
    const rng = rngForWorld(world, "history", `milestone_${rikishi.id}`);

    const updatedMilestones = [...milestones];

    // 1. Yusho Milestone
    if (lastBasho?.yusho === rikishi.id) {
      updatedMilestones.push({
        id: rng.uuid("ML"),
        type: "yusho",
        title: "Tournament Champion (優勝)",
        description: `Won the ${world.currentBashoName || "basho"} with a record of ${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}.`,
        date: { year, month },
      });
    }

    // 2. Career wins milestones (100, 500, etc.)
    const wins = rikishi.careerWins || 0;
    if (CAREER_WIN_MILESTONE_THRESHOLDS.includes(wins)) {
      updatedMilestones.push({
        id: rng.uuid("ML"),
        type: "stats_record",
        title: `${wins} Career Wins`,
        description: `Reached the landmark of ${wins} career victories.`,
        date: { year, month },
      });
    }

    // Queue rikishi update — milestones only, NOT careerHistory.
    // careerHistory is appended by publishBanzukeUpdate (with slice(-6)).
    builder.updateRikishi(rikishi.id, {
      milestones: updatedMilestones,
    });
  }

  return builder.build();
}

/**
 * Checks if a rikishi should change their shikona based on rank promotion.
 * Returns the new shikona if a change should occur, or null if no change.
 */
export function checkShikonaChange(
  world: WorldState,
  rikishi: Rikishi,
  previousRank?: string
): string | null {
  // Only trigger on significant rank promotions
  const currentRank = rikishi.rank.toLowerCase();
  const prevRank = previousRank?.toLowerCase();

  // Check for juryo → makuuchi promotion
  const promotedToMakuuchi = prevRank?.includes("juryo") && currentRank.includes("makuuchi");
  // Check for makuuchi → sanyaku promotion
  const promotedToSanyaku =
    (prevRank?.includes("maegashira") || prevRank?.includes("juryo")) &&
    (currentRank.includes("sekiwake") ||
      currentRank.includes("komusubi") ||
      currentRank.includes("ozeki") ||
      currentRank.includes("yokozuna"));

  if (!promotedToMakuuchi && !promotedToSanyaku) {
    return null;
  }

  // Get oyakata's former shikona for legacy patterns
  const heya = getHeya(world, rikishi.heyaId);
  if (!heya) return null;

  const oyakata = world.oyakata.get(heya.oyakataId);
  if (!oyakata?.formerShikona) return null;

  // Calculate probability based on oyakata archetype
  // Traditionalist oyakata: higher probability of legacy shikona
  // Scientist/Nurturer: lower probability
  const archetype = oyakata.archetype;
  let baseProbability = SHIKONA_CHANGE_BASE_PROBABILITY; // 30% base chance

  if (archetype === "traditionalist") baseProbability = SHIKONA_CHANGE_PROBABILITY_TRADITIONALIST;
  if (archetype === "tyrant") baseProbability = SHIKONA_CHANGE_PROBABILITY_TYRANT;
  if (archetype === "nurturer") baseProbability = SHIKONA_CHANGE_PROBABILITY_NURTURER;
  if (archetype === "scientist") baseProbability = SHIKONA_CHANGE_PROBABILITY_SCIENTIST;

  // Increase probability for sanyaku promotion
  if (promotedToSanyaku) baseProbability += SHIKONA_CHANGE_SANYAKU_BONUS;

  const rng = rngForWorld(world, "history", `shikona_change_${rikishi.id}_${world.year}`);

  if (rng.next() < baseProbability) {
    // Generate new shikona with legacy pattern
    const newShikona = generateShikona(
      `${world.seed}::shikona_change_${rikishi.id}_${world.year}`,
      {
        rng,
        heyaId: rikishi.heyaId,
        nationality: rikishi.nationality,
        rank: rikishi.rank,
        legacyShikona: oyakata.formerShikona,
      }
    );

    return newShikona;
  }

  return null;
}

/**
 * Records a shikona change milestone for a rikishi.
 */
export function recordShikonaChange(
  world: WorldState,
  rikishiId: string,
  oldShikona: string,
  newShikona: string
): void {
  const rikishi = getRikishi(world, rikishiId);
  if (!rikishi) return;

  if (!rikishi.milestones) rikishi.milestones = [];
  if (!rikishi.shikonaHistory) rikishi.shikonaHistory = [];

  const rng = rngForWorld(world, "history", `shikona_milestone_${rikishiId}`);

  // Add to milestones
  rikishi.milestones.push({
    id: rng.uuid("ML"),
    type: "shikona_change",
    title: "Shikona Change",
    description: `Changed shikona from ${oldShikona} to ${newShikona}.`,
    date: { year: world.year, month: world.calendar?.month ?? 1 },
  });

  // Add to shikona history
  rikishi.shikonaHistory.push({
    shikona: oldShikona,
    fromYear: world.year,
  });
}
