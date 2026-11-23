/**
 * heyaProjections.ts
 *
 * Projections for heya data with oyakata and roster information.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "@/engine/types/world";
import type { HeyaDataUI } from "@/presenters/uiDigestTypes";
import type { Rikishi } from "@/engine/types/rikishi";
import { projectRikishi } from "@/presenters/rikishi/index";
import { getHeyaRoster } from "@/engine/core/queries";
import { isKachiKoshi } from "@/engine/banzuke/banzukeHelpers";
import { getAllRikishi, isRetiredRikishiSummaryEntry } from "@/presenters/worldAccess";
import type { UIRikishi } from "@/presenters/rikishi/index";

/**
 * Project heya data with oyakata for ceremony components.
 */
export function projectHeyaData(world: WorldState, heyaId: string): HeyaDataUI | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const oyakata = world.oyakata.get(heya.oyakataId);
  const custodyHostName = heya.custodyStatus
    ? world.heyas.get(heya.custodyStatus.hostHeyaId)?.name
    : undefined;
  return {
    heya,
    oyakata,
    oyakataQuirks: oyakata?.quirks ?? [],
    oyakataTraits: oyakata?.traits,
    ...(custodyHostName ? { custodyHostName } : {}),
  };
}

/**
 * Project heya roster with calculated ages.
 */
export function projectHeyaRosterWithAge(
  world: WorldState,
  heyaId: string
): Array<{ rikishi: UIRikishi; age: number }> {
  const heya = world.heyas.get(heyaId);
  if (!heya) return [];

  const result: Array<{ rikishi: UIRikishi; age: number }> = [];
  // getHeyaRoster is memoized per world+week and already dedupes/resolves.
  for (const r of getHeyaRoster(world, heyaId)) {
    result.push({
      rikishi: projectRikishi(r, world),
      age: r.birthYear && world.year ? world.year - r.birthYear : 0,
    });
  }
  return result;
}

/** One basho's aggregated results for a stable's current roster. */
export interface StableBashoFormRow {
  /** Display label, e.g. "Hatsu 2025". */
  basho: string;
  wins: number;
  losses: number;
  /** Roster members who recorded a kachi-koshi this basho. */
  kachiKoshi: number;
  /** Roster members with a recorded snapshot this basho. */
  rikishi: number;
}

/**
 * Aggregate the current roster's recorded basho results (careerHistory
 * snapshots, capped at 6 by the engine) into per-basho W-L + kachi-koshi
 * totals, chronological. Kachi-koshi uses the engine's own per-rank
 * threshold check (isKachiKoshi) on each snapshot's recorded rank.
 */
export function projectStableBashoForm(world: WorldState, heyaId: string): StableBashoFormRow[] {
  const buckets = new Map<
    string,
    {
      year: number;
      month: number;
      bashoName: string;
      wins: number;
      losses: number;
      kachiKoshi: number;
      rikishi: number;
    }
  >();

  for (const r of getHeyaRoster(world, heyaId)) {
    for (const snap of r.careerHistory ?? []) {
      const key = snap.bashoId || `${snap.bashoName}-${snap.year}`;
      let b = buckets.get(key);
      if (!b) {
        b = {
          year: snap.year,
          month: snap.month,
          bashoName: snap.bashoName,
          wins: 0,
          losses: 0,
          kachiKoshi: 0,
          rikishi: 0,
        };
        buckets.set(key, b);
      }
      b.wins += snap.wins;
      b.losses += snap.losses;
      b.rikishi += 1;
      if (isKachiKoshi(snap.wins, snap.losses, snap.rank)) b.kachiKoshi += 1;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-6)
    .map((b) => ({
      basho: `${b.bashoName.charAt(0).toUpperCase()}${b.bashoName.slice(1)} ${b.year}`,
      wins: b.wins,
      losses: b.losses,
      kachiKoshi: b.kachiKoshi,
      rikishi: b.rikishi,
    }));
}

/** One stable's row in the last-basho league table. */
export interface StableLeagueRow {
  heyaId: string;
  heyaName: string;
  wins: number;
  losses: number;
  /** Roster members with a recorded snapshot in that basho. */
  rikishi: number;
  isPlayer: boolean;
}

export interface StableLeagueResult {
  /** Display label, e.g. "Hatsu 2025". */
  bashoLabel: string;
  rows: StableLeagueRow[];
}

/**
 * League table for the most recently completed basho: total recorded wins
 * per stable, aggregated from each rikishi's LATEST careerHistory snapshot
 * (picked by max year*100+month rather than trusting array order).
 * Retired rikishi whose full records still sit in historicalRikishi count
 * toward their last heya — they scored those wins for it. Stables closed
 * since the basho no longer appear: the table is the current league.
 * bashoId is `${bashoName}-${year}` — a degenerate year containing two
 * same-named basho (the kyushu-drift case) will blend them; CareerSnapshot
 * carries no occurrence key.
 */
export function projectStableLeague(world: WorldState): StableLeagueResult | null {
  const history = world.history ?? [];
  const last = history[history.length - 1];
  if (!last) return null;

  const bashoId = `${last.bashoName}-${last.year}`;
  const totals = new Map<string, { wins: number; losses: number; rikishi: number }>();
  for (const heya of world.heyas.values()) {
    totals.set(heya.id, { wins: 0, losses: 0, rikishi: 0 });
  }

  const universe = getAllRikishi(world) as Rikishi[];
  for (const entry of world.historicalRikishi?.values() ?? []) {
    if (!isRetiredRikishiSummaryEntry(entry)) universe.push(entry as Rikishi);
  }

  for (const r of universe) {
    const hist = r.careerHistory ?? [];
    let latest: (typeof hist)[number] | undefined;
    for (const snap of hist) {
      if (!latest || snap.year * 100 + snap.month > latest.year * 100 + latest.month) {
        latest = snap;
      }
    }
    if (!latest) continue;
    const snapKey = latest.bashoId || `${latest.bashoName}-${latest.year}`;
    if (snapKey !== bashoId) continue;
    const t = totals.get(r.heyaId);
    if (!t) continue;
    t.wins += latest.wins;
    t.losses += latest.losses;
    t.rikishi += 1;
  }

  const rows: StableLeagueRow[] = [];
  for (const heya of world.heyas.values()) {
    const t = totals.get(heya.id) ?? { wins: 0, losses: 0, rikishi: 0 };
    rows.push({
      heyaId: heya.id,
      heyaName: heya.name,
      wins: t.wins,
      losses: t.losses,
      rikishi: t.rikishi,
      isPlayer: heya.id === world.playerHeyaId,
    });
  }
  rows.sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || a.heyaName.localeCompare(b.heyaName)
  );

  return {
    bashoLabel: `${last.bashoName.charAt(0).toUpperCase()}${last.bashoName.slice(1)} ${last.year}`,
    rows,
  };
}
