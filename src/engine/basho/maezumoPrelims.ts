/**
 * §3 maezumo (前相撲) — the real preliminary for new recruits.
 *
 * Shin-deshi who pass the entrance exam are unranked: they fight short
 * maezumo bouts on days 3/5/7 of their first basho (up to three bouts,
 * done after two wins) and appear at the foot of the NEXT jonokuchi banzuke,
 * ordered by their maezumo results. Maezumo bouts never touch standings,
 * career records, or history — they only decide graduation order.
 *
 * Minted filler entrants (`isEphemeralMaezumo`, schedule.ts) are a separate
 * mechanism: they balance an odd jonokuchi card and never graduate.
 */

import type { Id } from "@/engine/types/common";
import type { BashoState, MaezumoState, MatchSchedule } from "@/engine/types/basho";
import type { BanzukeEntry } from "@/engine/types/banzuke";
import { toRankPosition } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { createImpactBuilder } from "@/engine/core/ImpactBuilder";

type Builder = ReturnType<typeof createImpactBuilder>;

/** Basho days on which maezumo bouts are held. */
export const MAEZUMO_BOUT_DAYS = [3, 5, 7] as const;
/** Wins that finish an entrant's maezumo early. */
export const MAEZUMO_WINS_TO_GRADUATE = 2;
/** Maximum maezumo bouts per entrant. */
export const MAEZUMO_MAX_BOUTS = 3;

/** Minted odd-card filler (legacy saves: id prefix, before the flag existed). */
export function isEphemeralMaezumoEntrant(r: Rikishi): boolean {
  return r.isEphemeralMaezumo === true || (r.isMaezumo === true && r.id.startsWith("maezumo-"));
}

/** Tsukedashi credential holders awaiting their first basho. */
export function pendingTsukedashiDebutants(world: WorldState): Rikishi[] {
  const out: Rikishi[] = [];
  for (const r of world.rikishi.values()) {
    if (r.isMaezumo === true && r.maezumoCompleted === true) out.push(r);
  }
  return out;
}

/** A real, still-unranked shin-deshi or returning banzuke-gai rikishi awaiting maezumo. */
export function isPendingShinDeshi(r: Rikishi): boolean {
  if (r.isRetired || isEphemeralMaezumoEntrant(r)) return false;
  if (r.isBanzukeGai === true) return true;
  return r.isMaezumo === true && r.maezumoCompleted !== true;
}

/** Mark a freshly recruited (non-tsukedashi) rookie as an unranked maezumo entrant. */
export function enrollInMaezumo<T extends Rikishi>(r: T): T {
  return { ...r, isMaezumo: true, maezumoCompleted: false };
}

/**
 * Build the maezumo roster for a new basho — every pending shin-deshi.
 * Returns undefined when nobody is enrolled so basho state stays byte-identical.
 */
export function initMaezumoState(world: WorldState): MaezumoState | undefined {
  const entrantIds: Id[] = [];
  for (const r of world.rikishi.values()) {
    if (isPendingShinDeshi(r)) entrantIds.push(r.id);
  }
  if (entrantIds.length === 0) return undefined;
  entrantIds.sort();
  return { entrantIds };
}

/** Per-entrant maezumo tally derived from resolved maezumo bouts. */
export interface MaezumoTally {
  wins: number;
  losses: number;
  bouts: number;
}

/** Tally maezumo results from the basho's resolved, flagged matches. */
export function tallyMaezumo(basho: BashoState): Map<Id, MaezumoTally> {
  const tally = new Map<Id, MaezumoTally>();
  for (const id of basho.maezumo?.entrantIds ?? []) tally.set(id, { wins: 0, losses: 0, bouts: 0 });
  for (const m of basho.matches) {
    if (!m.isMaezumoBout || !m.result) continue;
    for (const id of [m.eastRikishiId, m.westRikishiId]) {
      const t = tally.get(id);
      if (!t) continue;
      t.bouts++;
      if (m.result.winnerRikishiId === id) t.wins++;
      else if (!m.result.isDraw) t.losses++;
    }
  }
  return tally;
}

function needsMaezumoBout(t: MaezumoTally | undefined): boolean {
  return !!t && t.bouts < MAEZUMO_MAX_BOUTS && t.wins < MAEZUMO_WINS_TO_GRADUATE;
}

/**
 * Pair today's maezumo bouts. Entrants still short of two wins / three bouts
 * who are healthy are paired by record then id, preferring a different heya.
 * An odd man out simply sits the day.
 */
export function scheduleMaezumoDay(
  world: WorldState,
  basho: BashoState,
  day: number,
  busyIds?: ReadonlySet<Id>
): MatchSchedule[] {
  const state = basho.maezumo;
  if (!state || !(MAEZUMO_BOUT_DAYS as readonly number[]).includes(day)) return [];
  if (basho.matches.some((m) => m.day === day && m.isMaezumoBout)) return [];
  const tally = tallyMaezumo(basho);
  const pool: Rikishi[] = [];
  for (const id of state.entrantIds) {
    const r = world.rikishi.get(id);
    if (!r || !isPendingShinDeshi(r) || r.injured || r.isKyujo || busyIds?.has(id)) continue;
    if (needsMaezumoBout(tally.get(id))) pool.push(r);
  }
  pool.sort((a, b) => {
    const byWins = (tally.get(b.id)?.wins ?? 0) - (tally.get(a.id)?.wins ?? 0);
    return byWins !== 0 ? byWins : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const out: MatchSchedule[] = [];
  while (pool.length >= 2) {
    const [east] = pool.splice(0, 1);
    // Pool is capped at the maezumo entrant count (~10-40) and findIndex
    // early-exits — a non-same-heya partner usually matches within a few entries.
    let idx = pool.findIndex((r) => r.heyaId !== east.heyaId); // perf-hotspots: ignore
    if (idx < 0) idx = 0;
    const [west] = pool.splice(idx, 1);
    out.push({
      boutId: `b-${world.year}-${basho.bashoName}-d${day}-mz-${east.id}-${west.id}`,
      day,
      eastRikishiId: east.id,
      westRikishiId: west.id,
      isMaezumoBout: true,
    });
  }
  return out;
}

/** Highest jonokuchi rank number already seated on the new banzuke. */
function jonokuchiFloor(newBanzuke: readonly BanzukeEntry[]): number {
  let max = 0;
  for (const e of newBanzuke) {
    if (e.division === "jonokuchi" && e.position.rankNumber !== undefined) {
      max = Math.max(max, e.position.rankNumber);
    }
  }
  return max;
}

/**
 * Graduate this basho's maezumo entrants onto the foot of the new jonokuchi
 * banzuke, ordered by maezumo results. Entrants who never fought because
 * they were hurt at publish time stay unranked for the next basho.
 */
export function graduateMaezumoRikishi(
  world: WorldState,
  basho: BashoState,
  newBanzuke: readonly BanzukeEntry[],
  builder: Builder
): BanzukeEntry[] {
  if (basho.isExhibition) return [];

  // Tsukedashi debutants — credential holders awaiting their first printed
  // slot (`isMaezumo && maezumoCompleted`). They fought no prelims and skip
  // the jonokuchi floor entirely: the sheet seats them at the credential
  // rank stamped at materialization (Ms60 / Sd80). Graduates even when the
  // basho had no maezumo state — a TD-only intake still debuts.
  const tdEntries: BanzukeEntry[] = [];
  let tdIdx = 0;
  for (const r of world.rikishi.values()) {
    if (r.isMaezumo !== true || r.maezumoCompleted !== true) continue;
    if (r.rankNumber === undefined) continue; // TD credential is always a numbered slot
    builder.updateRikishi(r.id, { isMaezumo: false });
    tdEntries.push({
      rikishiId: r.id,
      division: r.division,
      position: toRankPosition({
        rank: r.rank,
        rankNumber: r.rankNumber,
        side: r.side ?? (tdIdx++ % 2 === 0 ? "east" : "west"),
      }),
    });
  }

  if (!basho.maezumo) return tdEntries;
  const tally = tallyMaezumo(basho);
  const grads: Array<{ r: Rikishi; t: MaezumoTally }> = [];
  for (const id of basho.maezumo.entrantIds) {
    const r = world.rikishi.get(id);
    const t = tally.get(id);
    if (!r || !t || !isPendingShinDeshi(r)) continue;
    if (t.bouts === 0 && (r.injured || r.isKyujo)) continue;
    grads.push({ r, t });
  }
  grads.sort((a, b) => {
    if (a.t.wins !== b.t.wins) return b.t.wins - a.t.wins;
    if (a.t.losses !== b.t.losses) return a.t.losses - b.t.losses;
    return a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0;
  });
  const floor = jonokuchiFloor(newBanzuke);
  const maezumoGrads = grads.map(({ r }, i) => {
    builder.updateRikishi(r.id, {
      isMaezumo: false,
      maezumoCompleted: true,
      isBanzukeGai: false,
      banzukeGaiReason: undefined,
    });
    return {
      rikishiId: r.id,
      division: "jonokuchi" as const,
      position: {
        rank: "jonokuchi" as const,
        rankNumber: floor + 1 + Math.floor(i / 2),
        side: i % 2 === 0 ? ("east" as const) : ("west" as const),
      },
    };
  });
  return [...tdEntries, ...maezumoGrads];
}
