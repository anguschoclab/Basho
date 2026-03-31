/**
 * archival.ts
 * ============
 * The 'Great Pruning' Engine.
 * 
 * Implements a tiered archival strategy to prevent save file bloat over decades of simulation.
 * Legendaries (Sekiwake+) are preserved in full fidelity; others are summarized or minimalized.
 */

import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { Id } from "./types/common";

/** Defines the structure for archived rikishi summary. */
export interface ArchivedRikishiSummary {
    id: Id;
    shikona: string;
    heyaId: Id;
    highestRank: string;
    debutYear: number;
    retiredYear: number;
    totalWins: number;
    totalLosses: number;
    yushoCount: number;
    isLegendary: boolean;
}

/**
 * Runs the archival process on a world state (usually before save).
 * Mutates the world.historicalRikishi map to 'prune' non-legendary data.
 */
export function runArchivalPruning(world: WorldState): void {
    if (!world.historicalRikishi) return;

    for (const [id, r] of world.historicalRikishi) {
        // If already pruned (is a summary object), skip
        if ((r as any).isPruned) continue;

        const tier = determineArchivalTier(r);

        if (tier === 1) {
            // Tier 1: Legendary. Keep 100% data.
            continue;
        }

        if (tier === 2) {
            // Tier 2: Sekitori. Summarize career but keep milestones.
            pruneToTier2(r);
        } else {
            // Tier 3: Clerical. Minimal record.
            pruneToTier3(r);
        }
    }
}

/**
 * Tier 1: Sekiwake or higher, OR any Top Division Yusho.
 */
function determineArchivalTier(r: Rikishi): 1 | 2 | 3 {
    const sanyaku = ["yokozuna", "ozeki", "sekiwake"];
    const highestRank = (r as any).highestRank || r.rank;
    const yushoCount = (r.careerRecord?.yusho || 0);

    if (sanyaku.includes(highestRank.toLowerCase()) || yushoCount > 0) {
        return 1;
    }

    const sekitori = ["komusubi", "maegashira", "juryo"];
    if (sekitori.includes(highestRank.toLowerCase())) {
        return 2;
    }

    return 3;
}

function pruneToTier2(r: any): void {
    r.isPruned = true;
    r.pruningTier = 2;
    
    // Purge session-heavy data
    delete r.bashoHistory;
    delete r.pbpLogs;
    delete r.trainingHistory;
    delete r.perceptionHistory;

    // Keep: Shikona, Career Stats, Milestones, Mentor
}

function pruneToTier3(r: any): void {
    r.isPruned = true;
    r.pruningTier = 3;

    // Purge almost everything
    delete r.bashoHistory;
    delete r.pbpLogs;
    delete r.trainingHistory;
    delete r.perceptionHistory;
    delete r.milestones;
    delete r.economics;
    delete r.baseStats;
    delete r.currentStats;
    delete r.skills;
    
    // Keep: Shikona, HeyaId, Debut/Retire Dates, Total Wins/Losses
}
