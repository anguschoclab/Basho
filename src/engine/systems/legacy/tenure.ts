/**
 * tenure.ts — WS5 oyakata tenure bookkeeping.
 *
 * Central helpers so every producer writes through the same shape:
 * `applyBashoTenure` (basho end: served/championships/underperformance streak
 * + legacyModifier decay) and `bumpTenure` (scalar counters: insolvency
 * events, major scandals, sekitori produced, forced mergers).
 */

import type { WorldState } from "../../types/world";
import type { BashoState } from "../../types/basho";
import type { Heya } from "../../types/heya";
import type { Oyakata } from "../../types/oyakata";
import type { ImpactBuilder } from "../../core/ImpactBuilder";
import type { Division } from "../../types/banzuke";
import { isSekitoriDivision } from "../../../constants/engine/rankDisplay";
import {
  SEKITORI_KACHI_KOSHI_WINS,
  UNDERPERFORMANCE_MIN_BOUTS,
} from "../../../constants/engine/succession";

type Tenure = NonNullable<Oyakata["tenure"]>;
type TenureCounter = Exclude<keyof Tenure, "startedYear">;

function baseTenure(year: number): Tenure {
  return {
    startedYear: year,
    bashoServed: 0,
    championships: 0,
    sekitoriProduced: 0,
    insolvencyEvents: 0,
    majorScandals: 0,
    forcedMergers: 0,
  };
}

/** Increment scalar tenure counters on the heya's sitting oyakata. */
export function bumpTenure(
  world: WorldState,
  builder: ImpactBuilder,
  heyaId: string,
  delta: Partial<Record<TenureCounter, number>>
): void {
  const heya = world.heyas.get(heyaId);
  const oya = heya?.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
  if (!oya) return;
  const tenure = { ...baseTenure(world.year), ...oya.tenure };
  for (const [k, v] of Object.entries(delta) as [TenureCounter, number][]) {
    tenure[k] = (tenure[k] ?? 0) + v;
  }
  builder.updateOyakata(oya.id, { tenure });
}

/**
 * Basho-end tenure + standing updates.
 * - bashoServed++ for every heya that fielded entrants.
 * - championships++ for the yusho winner's heya's oyakata.
 * - consecutiveUnderperformanceBasho: the documented counter the
 *   non-financial merger path reads — a heya underperforms when no sekitori
 *   entrant reaches kachi-koshi (≥8 wins). Resets on any sekitori KK.
 * - legacyModifier decay: one basho closer to the successor standing alone.
 */
export function applyBashoTenure(
  world: WorldState,
  builder: ImpactBuilder,
  basho: BashoState,
  yushoRikishiId: string
): void {
  const yushoRikishi = world.rikishi.get(yushoRikishiId);
  const winnerHeyaId = yushoRikishi?.heyaId;

  // Aggregate each heya's sekitori record this basho.
  const sekitoriKK = new Set<string>();
  const entered = new Set<string>();
  for (const [rid] of basho.standings ?? new Map<string, { wins: number; losses: number }>()) {
    const r = world.rikishi.get(rid);
    if (!r?.heyaId) continue;
    entered.add(r.heyaId);
    if (!isSekitoriDivision(r.division)) continue;
    const rec = basho.standings.get(rid);
    if (rec && rec.wins + rec.losses >= UNDERPERFORMANCE_MIN_BOUTS && rec.wins >= SEKITORI_KACHI_KOSHI_WINS) {
      sekitoriKK.add(r.heyaId);
    }
  }

  // Accumulate all tenure deltas per heya, then write once — successive
  // bumpTenure calls read the pre-resolution world, so two writes would
  // overwrite each other's tenure object via the shallow entity merge.
  const deltas = new Map<string, Partial<Record<TenureCounter, number>>>();
  const addDelta = (heyaId: string, d: Partial<Record<TenureCounter, number>>) => {
    const cur = deltas.get(heyaId) ?? {};
    for (const [k, v] of Object.entries(d) as [TenureCounter, number][]) {
      cur[k] = (cur[k] ?? 0) + v;
    }
    deltas.set(heyaId, cur);
  };

  for (const heyaId of entered) {
    addDelta(heyaId, { bashoServed: 1 });
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;
    builder.updateHeya(heyaId, {
      consecutiveUnderperformanceBasho: sekitoriKK.has(heyaId)
        ? 0
        : (heya.consecutiveUnderperformanceBasho ?? 0) + 1,
    });
  }

  if (winnerHeyaId) {
    addDelta(winnerHeyaId, { championships: 1 });
  }

  for (const [heyaId, delta] of deltas) {
    bumpTenure(world, builder, heyaId, delta);
  }

  // Legacy modifier decay — the predecessor's shadow shortens each basho.
  for (const [heyaId, heya] of world.heyas) {
    const lm = heya.legacyModifier;
    if (!lm) continue;
    if (lm.bashoRemaining <= 1) {
      builder.updateHeya(heyaId, { legacyModifier: undefined });
    } else {
      builder.updateHeya(heyaId, {
        legacyModifier: { ...lm, bashoRemaining: lm.bashoRemaining - 1 },
      });
    }
  }
}

/**
 * Sekitori promotion bookkeeping — called from applyNewRanks when a rikishi
 * crosses into juryo/makuuchi. `newDivision` is the post-banzuke division.
 */
export function recordSekitoriPromotion(
  world: WorldState,
  builder: ImpactBuilder,
  heya: Heya,
  wasSekitori: boolean,
  newDivision: Division
): void {
  if (wasSekitori || !isSekitoriDivision(newDivision)) return;
  bumpTenure(world, builder, heya.id, { sekitoriProduced: 1 });
}
