// mergers.ts
// Resolves forced closures and mergers for underperforming or insolvent stables.
// Aligned with Basho Constitution A13 (19. Stable Mergers, 20. Forced Closures).

import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import { logEngineEvent } from "./events";
import { generateGovernanceHeadline } from "./media";
import { updateFacilitiesBand } from "./facilities";
import { rngForWorld } from "./rng";

/**
 * Execute a stable merger.
 * The source stable is merged into the target stable.
 * - Rikishi are transferred.
 * - Facilities and funds are partially absorbed.
 * - Source stable is removed from the world.
 */
export function executeMerger(world: WorldState, sourceHeyaId: string, targetHeyaId: string, reason: string): void {
  const source = world.heyas.get(sourceHeyaId);
  const target = world.heyas.get(targetHeyaId);

  if (!source || !target) return;

  // 1. Transfer rikishi
  for (const rId of source.rikishiIds) {
    const rikishi = world.rikishi.get(rId);
    if (rikishi) {
      rikishi.heyaId = target.id;
      target.rikishiIds.push(rId);

      logEngineEvent(world, {
        type: "RIKISHI_TRANSFERRED",
        category: "career",
        importance: "notable",
        scope: "rikishi",
        rikishiId: rId,
        heyaId: target.id,
        title: `${rikishi.shikona || rikishi.name} transferred to ${target.name}`,
        summary: `Following the merger, ${rikishi.shikona || rikishi.name} has moved to ${target.name}.`,
        data: { oldHeyaId: source.id, newHeyaId: target.id }
      });
    }
  }
  source.rikishiIds = [];

  // 2. Combine funds (partially, penalties apply for scandal)
  // If source had debt, it might not transfer fully, but positive funds transfer partially
  if (source.funds > 0) {
    const transferRatio = source.scandalScore > 50 ? 0.2 : 0.5; // Scandal reduces favorable outcomes
    target.funds += Math.floor(source.funds * transferRatio);
  }

  // 3. Combine facilities (diminishing returns)
  target.facilities.training = Math.min(100, target.facilities.training + Math.floor(source.facilities.training * 0.2));
  target.facilities.recovery = Math.min(100, target.facilities.recovery + Math.floor(source.facilities.recovery * 0.2));
  target.facilities.nutrition = Math.min(100, target.facilities.nutrition + Math.floor(source.facilities.nutrition * 0.2));
  updateFacilitiesBand(target);

  // 4. Log the merger
  logEngineEvent(world, {
    type: "STABLE_MERGED",
    category: "discipline",
    importance: "headline",
    scope: "heya",
    heyaId: target.id,
    title: `${source.name} merges with ${target.name}`,
    summary: `${source.name} has been formally absorbed into ${target.name}. Reason: ${reason}.`,
    data: { sourceHeyaId: source.id, targetHeyaId: target.id, reason }
  });

  generateGovernanceHeadline({
    world,
    heyaId: target.id,
    type: "merger",
    severity: "critical",
    description: `The Sumo Association has approved the absorption of ${source.name} into ${target.name}.`
  });

  // 5. Remove source stable
  world.heyas.delete(source.id);

  // Clean up references in world history/almanac if necessary (usually ID is kept for historical lookups)
  // However, we should keep the Heya object in an archive or let history events refer to the ID.
  // The constitution states: "identity retired", meaning it's no longer active.
  if (!world.closedHeyas) {
      world.closedHeyas = new Map();
  }
  world.closedHeyas.set(source.id, {
      ...source,
      closedAtYear: world.year,
      closedAtBasho: world.currentBashoName,
      mergedInto: target.id
  });
}

/**
 * Identify a suitable target stable for a merger.
 * Deterministic selection based on prestige, roster size, and random seed.
 */
export function findMergerTarget(world: WorldState, sourceHeyaId: string): string | null {
  const source = world.heyas.get(sourceHeyaId);
  if (!source) return null;

  const rng = rngForWorld(world, `merger_${sourceHeyaId}_${world.year}_${world.week}`);

  // Candidates: not the source, not player (unless forced, but usually NPC targets NPC),
  // has room in roster (< 25 rikishi), and prestige >= modest.
  const candidates = Array.from(world.heyas.values()).filter(h =>
    h.id !== sourceHeyaId &&
    h.rikishiIds.length < 25 &&
    (h.prestigeBand === "elite" || h.prestigeBand === "respected" || h.prestigeBand === "modest")
  );

  if (candidates.length === 0) {
    // Fallback: any stable with room
    const fallback = Array.from(world.heyas.values()).filter(h => h.id !== sourceHeyaId && h.rikishiIds.length < 30);
    if (fallback.length === 0) return null;
    return fallback[rng.int(0, fallback.length - 1)].id;
  }

  // Weight by prestige and funds
  candidates.sort((a, b) => b.funds - a.funds);
  return candidates[rng.int(0, Math.min(candidates.length - 1, 3))].id;
}
