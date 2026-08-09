/**
 * stableSelectionProjections.ts
 *
 * Extracted from MainMenu.tsx (SRP-05).
 * Groups heyas by stature band and selects recommended stables for the stable selection flow.
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { StatureBand } from "@/engine/types/narrative";
import { getSekitoriInHeya } from "@/engine/queries";

const STATURE_BANDS: StatureBand[] = [
  "legendary",
  "powerful",
  "established",
  "rebuilding",
  "fragile",
  "new",
];

function emptyGroups(): Record<StatureBand, Heya[]> {
  return {
    legendary: [],
    powerful: [],
    established: [],
    rebuilding: [],
    fragile: [],
    new: [],
  };
}

export function selectStablesByStature(world: WorldState): Record<StatureBand, Heya[]> {
  const groups = emptyGroups();
  for (const h of world.heyas.values() as IterableIterator<Heya>) {
    groups[h.statureBand]?.push(h);
  }
  return groups;
}

export function selectRecommendedStables(world: WorldState): Heya[] {
  const stables = Array.from(world.heyas.values()) as Heya[];
  if (stables.length === 0) return [];

  const sekitoriCounts = new Map<string, number>();
  for (const h of stables) {
    sekitoriCounts.set(h.id, getSekitoriInHeya(world, h.id));
  }

  const groups = emptyGroups();
  for (const h of stables) {
    groups[h.statureBand]?.push(h);
  }

  // Sort each group by sekitori count descending
  for (const band of STATURE_BANDS) {
    groups[band].sort((a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0));
  }

  // Curated selection: variety of challenge levels
  const picks: Heya[] = [];
  // Easy: Legendary/Powerful (top tier)
  if (groups.legendary.length > 0) picks.push(groups.legendary[0]);
  else if (groups.powerful.length > 0) picks.push(groups.powerful[0]);

  // Medium: Established (solid choices)
  picks.push(...groups.established.slice(0, 2));

  // Hard: Rebuilding (challenging)
  if (groups.rebuilding.length > 0) picks.push(groups.rebuilding[0]);

  // Very Hard: Fragile/New (extreme challenge)
  if (groups.fragile.length > 0) picks.push(groups.fragile[0]);
  else if (groups.new.length > 0) picks.push(groups.new[0]);

  // Fill remaining slots maintaining variety (round-robin from each band)
  const remainingBands: StatureBand[] = [
    "fragile",
    "new",
    "rebuilding",
    "established",
    "powerful",
    "legendary",
  ];
  const pickedIds = new Set(picks.map((p) => p.id));
  let bandIdx = 0;
  while (picks.length < 6 && bandIdx < remainingBands.length * 3) {
    const band = remainingBands[bandIdx % remainingBands.length];
    const bandStables = groups[band];
    let pickCount = 0;
    for (const p of picks) {
      if (p.statureBand === band) pickCount++;
    }
    if (bandStables[pickCount]) {
      const next = bandStables[pickCount];
      if (!pickedIds.has(next.id)) {
        picks.push(next);
        pickedIds.add(next.id);
      }
    }
    bandIdx++;
  }

  // Final fallback: any remaining stables by sekitori count
  const allSorted = stables.sort(
    (a, b) => (sekitoriCounts.get(b.id) ?? 0) - (sekitoriCounts.get(a.id) ?? 0)
  );
  for (const h of allSorted) {
    if (picks.length >= 6) break;
    if (!pickedIds.has(h.id)) {
      picks.push(h);
      pickedIds.add(h.id);
    }
  }

  return picks.slice(0, 6);
}
