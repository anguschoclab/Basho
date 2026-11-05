/**
 * heyaRecord.ts — synthetic heya-level Almanac stats.
 *
 * `generateHeyaRecord` derives plausible career totals (yusho, sansho, top-division
 * records) from `heya.statureBand` plus seeded `rng`. Like `career.ts`, this is
 * presentation backfill — it does not reflect recorded per-basho results.
 */
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { HeyaRecord } from "@/engine/almanac/types";
import { getRikishi } from "@/engine/core/queries";

/**
 * Build a synthetic `HeyaRecord` for the Almanac. Counts only wrestlers in
 * `world.activeRikishiIds` affiliated with `heya.id` — retired members are excluded.
 */
export function generateHeyaRecord(heya: Heya, world: WorldState, rng: () => number): HeyaRecord {
  const rikishiInHeya = [];
  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    if (r && r.heyaId === heya.id) {
      rikishiInHeya.push(r);
    }
  }

  const statureMultiplier =
    {
      legendary: 4,
      powerful: 2.5,
      established: 1.5,
      rebuilding: 0.8,
      fragile: 0.5,
      new: 0.1,
    }[heya.statureBand] || 1;

  return {
    heyaId: heya.id,
    name: heya.name,
    totalYusho: Math.floor(statureMultiplier * 5 + rng() * 10),
    totalJunYusho: Math.floor(statureMultiplier * 8 + rng() * 15),
    totalSansho: Math.floor(statureMultiplier * 15 + rng() * 25),
    yokozunaProduced: Math.floor(statureMultiplier * 0.5 + rng() * 2),
    ozekiProduced: Math.floor(statureMultiplier * 1.5 + rng() * 3),
    sekitoriProduced: Math.floor(statureMultiplier * 10 + rng() * 20),
    bashoHistory: [],
    foundedYear: world.year - Math.floor(20 + statureMultiplier * 30 + rng() * 50),
  };
}
