/**
 * MetaPerception.ts
 * ==================
 * Manager-facing read of the era meta (canon §§6–8).
 *
 * The world tracks kimarite usage and computes era tone/drift yearly via
 * EraDriftService. That raw data is hidden from managers: this module converts
 * the *completed* yearly assessments (world.meta.history) into banded signals
 * only. Live mid-year `globalKimariteStats` are never consulted — perception is
 * time-gated by construction, so a mid-year spike cannot trigger a same-tick
 * reaction (canon §8 reaction lag).
 */

import type { WorldState, MetaHistoryEntry } from "../types/world";
import type { MetaPerception } from "../ai/types";
import { getRikishi } from "../queries";
import {
  META_DOMINANCE_ESTABLISHED_SHARE,
  META_DOMINANCE_EMERGING_SHARE,
  META_PRESENCE_ASCENDANT_DELTA,
  META_PRESENCE_WANING_DELTA,
  META_PRESENCE_ABSENT_SHARE,
  META_TREND_DELTA,
  META_INJURY_ELEVATED_FRACTION,
  META_INJURY_NORMAL_FRACTION,
} from "../../constants/engine/perception";

type Family = "push" | "belt" | "speed" | "trick";
const FAMILIES: Family[] = ["push", "belt", "speed", "trick"];
type Presence = MetaPerception["familyPresence"][Family];

function dominantFamilyOf(entry: MetaHistoryEntry | undefined): Family | "none" {
  if (!entry) return "none";
  let best: Family | "none" = "none";
  let bestShare = 0;
  for (const f of FAMILIES) {
    const share = entry.familyShares[f] ?? 0;
    if (share > bestShare) {
      bestShare = share;
      best = f;
    }
  }
  return bestShare > 0 ? best : "none";
}

function presenceFor(family: Family, latest?: MetaHistoryEntry, previous?: MetaHistoryEntry): Presence {
  const share = latest?.familyShares[family] ?? 0;
  const prevShare = previous?.familyShares[family] ?? 0;
  if (share < META_PRESENCE_ABSENT_SHARE) return "absent";
  if (share - prevShare >= META_PRESENCE_ASCENDANT_DELTA) return "ascendant";
  if (prevShare - share >= META_PRESENCE_WANING_DELTA) return "waning";
  return "present";
}

function injuryClimateOf(world: WorldState): MetaPerception["injuryClimate"] {
  const total = world.activeRikishiIds.size;
  if (total === 0) return "low";
  let injured = 0;
  for (const id of world.activeRikishiIds) {
    const r = getRikishi(world, id);
    if (r && (r.injured || r.isKyujo)) injured++;
  }
  const fraction = injured / total;
  if (fraction >= META_INJURY_ELEVATED_FRACTION) return "elevated";
  if (fraction >= META_INJURY_NORMAL_FRACTION) return "normal";
  return "low";
}

/**
 * Build the banded meta perception for manager AI.
 * Pure and deterministic — identical world state always yields identical output.
 */
export function buildMetaPerception(world: WorldState): MetaPerception {
  const history = world.meta?.history ?? [];
  const latest = history.at(-1);
  const previous = history.length >= 2 ? history.at(-2) : undefined;

  const dominantFamily = dominantFamilyOf(latest);
  const dominantShare =
    dominantFamily === "none" || !latest ? 0 : latest.familyShares[dominantFamily];

  const dominanceBand: MetaPerception["dominanceBand"] =
    dominantFamily === "none"
      ? "unclear"
      : dominantShare >= META_DOMINANCE_ESTABLISHED_SHARE
        ? "established"
        : dominantShare >= META_DOMINANCE_EMERGING_SHARE
          ? "emerging"
          : "unclear";

  let trend: MetaPerception["trend"] = "stable";
  if (latest && previous && dominantFamily !== "none") {
    const delta = latest.familyShares[dominantFamily] - previous.familyShares[dominantFamily];
    if (delta >= META_TREND_DELTA) trend = "strengthening";
    else if (delta <= -META_TREND_DELTA) trend = "reversing";
  }

  const familyPresence = {} as MetaPerception["familyPresence"];
  for (const f of FAMILIES) {
    familyPresence[f] = presenceFor(f, latest, previous);
  }

  return {
    eraTone: world.meta?.tone ?? "classic",
    dominantFamily,
    dominanceBand,
    familyPresence,
    trend,
    injuryClimate: injuryClimateOf(world),
  };
}
