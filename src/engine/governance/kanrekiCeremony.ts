/**
 * Kanreki Dohyo-iri Ceremony
 *
 * When a yokozuna reaches their 60th year (kanreki), a special
 * dohyo-iri ceremony is performed. This is an extremely rare event
 * that generates a unique narrative and gives a large popularity boost.
 * In real sumo, this has only happened a handful of times.
 */

import type { Rikishi } from "../types/rikishi";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";

/** Age at which kanreki occurs */
export const KANREKI_AGE = 60;

/** Popularity boost for kanreki ceremony */
export const KANREKI_POPULARITY_BOOST = 30;

/**
 * Check if a rikishi is eligible for a kanreki dohyo-iri.
 * Must be a yokozuna (current or former) and turning 60.
 */
export function isEligibleForKanreki(rikishi: Rikishi, world: WorldState): boolean {
  const age = world.year - rikishi.birthYear;
  if (age !== KANREKI_AGE) return false;
  if (rikishi.rank !== "yokozuna" && !rikishi.dohyoIriStyle) return false;
  return true;
}

/**
 * Check if a kanreki ceremony has already been performed for this rikishi.
 * Uses the event log to find prior kanreki events.
 */
export function hasHadKanrekiCeremony(world: WorldState, rikishiId: string): boolean {
  const log = world.events?.log;
  if (!log) return false;

  return log.some(
    (e: { type: string; category: string; data: Record<string, unknown> }) =>
      e.type === "BASHO_STATUS" &&
      e.category === "milestone" &&
      e.data?.status === "kanreki_dohyo_iri" &&
      e.data?.rikishiId === rikishiId
  );
}

/**
 * Generate and log the kanreki dohyo-iri ceremony event.
 * Applies a large popularity boost to the yokozuna.
 */
export function performKanrekiCeremony(world: WorldState, yokozuna: Rikishi): StateImpact {
  const builder = createImpactBuilder("performKanrekiCeremony");

  if (!isEligibleForKanreki(yokozuna, world)) {
    return builder.build();
  }

  if (hasHadKanrekiCeremony(world, yokozuna.id)) {
    return builder.build();
  }

  // Apply popularity boost via economics
  if (yokozuna.economics) {
    builder.updateRikishi(yokozuna.id, {
      economics: {
        ...yokozuna.economics,
        popularity: Math.min(100, yokozuna.economics.popularity + KANREKI_POPULARITY_BOOST),
      },
    });
  }

  const style = yokozuna.dohyoIriStyle ?? "unryu";

  builder.logEvent(
    "BASHO_STATUS",
    "milestone",
    {
      status: "kanreki_dohyo_iri",
      description: `${yokozuna.shikona} performs the kanreki dohyo-iri — a rare ceremony celebrating 60 years of life. The ${style} style is displayed one final time in this special ceremony.`,
      rikishiId: yokozuna.id,
      heyaId: yokozuna.heyaId,
      age: KANREKI_AGE,
      style,
      popularityBoost: KANREKI_POPULARITY_BOOST,
    },
    { importance: "headline", rikishiId: yokozuna.id, heyaId: yokozuna.heyaId }
  );

  return builder.build();
}
