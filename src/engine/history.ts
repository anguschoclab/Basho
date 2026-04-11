import { rngForWorld } from "./rng";
import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { CareerSnapshot } from "./types/history";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

/**
 * Generates a career snapshot for a Rikishi based on their current state and the last basho's results.
 */
export function generateCareerSnapshot(world: WorldState, rikishi: Rikishi): CareerSnapshot {
  const lastBasho = world.history.length > 0 ? world.history[world.history.length - 1] : undefined;
  
  const rng = rngForWorld(world, "history", `career_${rikishi.id}_${world.year}_${world.currentBashoName}`);
  const bashoId = lastBasho 
    ? lastBasho.id
    : `${world.year}-${world.currentBashoName || "Honbasho"}`;
  
  return {
    id: rng.uuid('CH'),
    bashoId,

    year: world.year,
    month: world.calendar.month,
    bashoName: world.currentBashoName || "Honbasho",
    
    rank: rikishi.rank,
    division: rikishi.division,
    rankNumber: rikishi.rankNumber || 1,
    side: rikishi.side,
    
    wins: rikishi.currentBashoWins || 0,
    losses: rikishi.currentBashoLosses || 0,
    absences: 0, // Engine doesn't track absences yet
    
    isYusho: lastBasho?.yusho === rikishi.id,
    isJunYusho: lastBasho?.junYusho?.includes(rikishi.id) || false,
    specialPrizes: {
      shukunsho: lastBasho?.shukunsho === rikishi.id,
      kantosho: lastBasho?.kantosho === rikishi.id,
      ginosho: lastBasho?.ginoSho === rikishi.id,
    },
    
    weight: rikishi.weight,
    momentum: rikishi.momentum
  };
}

/**
 * Detects and records milestones for a Rikishi.
 */
export function recordMilestones(world: WorldState, rikishi: Rikishi) {
  if (!rikishi.milestones) rikishi.milestones = [];
  
  const year = world.year;
  const month = world.calendar.month;
  const lastBasho = world.history.length > 0 ? world.history[world.history.length - 1] : undefined;

  const rng = rngForWorld(world, "history", `milestone_${rikishi.id}`);

  // 1. Yusho Milestone
  if (lastBasho?.yusho === rikishi.id) {
    rikishi.milestones.push({
      id: rng.uuid('ML'),
      type: "yusho",
      title: "Tournament Champion (優勝)",
      description: `Won the ${world.currentBashoName || "basho"} with a record of ${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}.`,
      date: { year, month }
    });
  }

  // 2. Career wins milestones (100, 500, etc.)
  const wins = rikishi.careerWins || 0;
  if ([100, 500, 700, 1000].includes(wins)) {
     rikishi.milestones.push({
      id: rng.uuid('ML'),
      type: "stats_record",
      title: `${wins} Career Wins`,
      description: `Reached the landmark of ${wins} career victories.`,
      date: { year, month }
    });
  }
}

/**
 * Updates career history for all active Rikishi.
 * Returns StateImpact describing history updates instead of mutating state.
 */
export function runHistoryUpdates(world: WorldState): StateImpact {
  const builder = createImpactBuilder('historyUpdates');

  for (const rikishi of world.rikishi.values()) {
    const careerHistory = rikishi.careerHistory || [];
    
    // Generate new snapshot
    const newSnapshot = generateCareerSnapshot(world, rikishi);
    const updatedCareerHistory = [...careerHistory, newSnapshot];
    
    // Record milestones
    const milestones = rikishi.milestones || [];
    const year = world.year;
    const month = world.calendar.month;
    const lastBasho = world.history.length > 0 ? world.history[world.history.length - 1] : undefined;
    const rng = rngForWorld(world, "history", `milestone_${rikishi.id}`);

    const updatedMilestones = [...milestones];

    // 1. Yusho Milestone
    if (lastBasho?.yusho === rikishi.id) {
      updatedMilestones.push({
        id: rng.uuid('ML'),
        type: "yusho",
        title: "Tournament Champion (優勝)",
        description: `Won the ${world.currentBashoName || "basho"} with a record of ${rikishi.currentBashoWins}-${rikishi.currentBashoLosses}.`,
        date: { year, month }
      });
    }

    // 2. Career wins milestones (100, 500, etc.)
    const wins = rikishi.careerWins || 0;
    if ([100, 500, 700, 1000].includes(wins)) {
      updatedMilestones.push({
        id: rng.uuid('ML'),
        type: "stats_record",
        title: `${wins} Career Wins`,
        description: `Reached the landmark of ${wins} career victories.`,
        date: { year, month }
      });
    }

    // Queue rikishi update
    builder.updateRikishi(rikishi.id, {
      careerHistory: updatedCareerHistory,
      milestones: updatedMilestones
    });
  }

  return builder.build();
}

