/**
 * Exhibition Basho (Jungyo) System
 *
 * Exhibition basho are non-ranking events held between the 6 official
 * honbasho. They do not update banzuke standings, have reduced injury
 * risk, award partial stipends, and can seed/advance rivalries.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { rngForWorld } from "@/engine/core/rng";
import {
  EXHIBITION_INJURY_RISK_MULTIPLIER,
  EXHIBITION_STIPEND_MULTIPLIER,
  EXHIBITION_RIVALRY_SEED_CHANCE,
  EXHIBITION_BASE_STIPEND,
  EXHIBITION_INJURY_BASE_CHANCE,
  EXHIBITION_INJURY_FATIGUE_PENALTY,
} from "@/constants/engine/exhibitionBasho";
import {
  ensureRivalriesState,
  makeRivalryKey,
  createFreshPair,
} from "@/engine/narrative/rivalry/state";

/** Exhibition basho type — extends the 6 honbasho with jungyo events */
type ExhibitionBashoName = `${string}-jungyo`;

/** Check if a basho name is an exhibition (jungyo) event */
export function isExhibitionBasho(name: string): name is ExhibitionBashoName {
  return name.endsWith("-jungyo");
}

// Re-export constants for backward compatibility
export {
  EXHIBITION_INJURY_RISK_MULTIPLIER,
  EXHIBITION_STIPEND_MULTIPLIER,
  EXHIBITION_RIVALRY_SEED_CHANCE,
};

/** Exhibition basho info */
interface ExhibitionBashoInfo {
  name: ExhibitionBashoName;
  displayName: string;
  month: number;
  location: string;
  isHonbasho: false;
}

/**
 * Generate exhibition basho events that occur between honbasho.
 * Returns the jungyo events for a given year, inserted between the 6 honbasho.
 */
export function getExhibitionBashoSchedule(_year: number): ExhibitionBashoInfo[] {
  const events: ExhibitionBashoInfo[] = [
    {
      name: "february-jungyo",
      displayName: "February Jungyo Tour",
      month: 2,
      location: "Regional Tour",
      isHonbasho: false,
    },
    {
      name: "april-jungyo",
      displayName: "April Jungyo Tour",
      month: 4,
      location: "Regional Tour",
      isHonbasho: false,
    },
    {
      name: "june-jungyo",
      displayName: "June Jungyo Tour",
      month: 6,
      location: "Regional Tour",
      isHonbasho: false,
    },
    {
      name: "august-jungyo",
      displayName: "August Jungyo Tour",
      month: 8,
      location: "Regional Tour",
      isHonbasho: false,
    },
    {
      name: "october-jungyo",
      displayName: "October Jungyo Tour",
      month: 10,
      location: "Regional Tour",
      isHonbasho: false,
    },
    {
      name: "december-jungyo",
      displayName: "December Jungyo Tour",
      month: 12,
      location: "Regional Tour",
      isHonbasho: false,
    },
  ];
  return events;
}

/**
 * Check if a basho name is a honbasho (official ranking tournament).
 */
export function isHonbasho(name: string): boolean {
  return ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"].includes(name);
}

/**
 * Simulate an exhibition basho for a heya's rikishi.
 * No banzuke updates, reduced injury risk, partial stipend, possible rivalry seeding.
 */
export function simulateExhibitionBasho(
  world: WorldState,
  bashoName: ExhibitionBashoName,
  participants: Rikishi[]
): StateImpact {
  const builder = createImpactBuilder("simulateExhibitionBasho");
  const rng = rngForWorld(world, "exhibition", bashoName);

  // Rivalry seeds accumulate into a single overlay — writing the worldField
  // inside the loop would last-win clobber earlier seeds (each update is a
  // whole-object snapshot computed from the same base world).
  const rivalriesOverlay = ensureRivalriesState(world);
  const seededPairs: typeof rivalriesOverlay.pairs = {};

  for (const riki of participants) {
    if (riki.isRetired) continue;

    // Partial stipend
    const baseStipend = EXHIBITION_BASE_STIPEND;
    const stipend = Math.round(baseStipend * EXHIBITION_STIPEND_MULTIPLIER);
    if (riki.economics) {
      builder.updateRikishi(riki.id, {
        economics: {
          ...riki.economics,
          cash: (riki.economics.cash ?? 0) + stipend,
        },
      });
    }

    // Reduced injury risk — exhibition knocks are modeled as fatigue, not an
    // injury record (jungyo bouts are light contact).
    const injuryRoll = rng.next();
    if (injuryRoll < EXHIBITION_INJURY_BASE_CHANCE * EXHIBITION_INJURY_RISK_MULTIPLIER) {
      builder.updateRikishi(riki.id, {
        fatigue: (riki.fatigue ?? 0) + EXHIBITION_INJURY_FATIGUE_PENALTY,
      });
    }

    // Possible rivalry seeding — actually seed the pair, not just the event.
    const rivalryRoll = rng.next();
    if (rivalryRoll < EXHIBITION_RIVALRY_SEED_CHANCE) {
      // Pick a random other participant as potential rival
      const others = participants.filter((r) => r.id !== riki.id && r.heyaId !== riki.heyaId);
      if (others.length > 0) {
        const rival = others[Math.floor(rng.next() * others.length)];
        const key = makeRivalryKey(riki.id, rival.id);
        if (!rivalriesOverlay.pairs[key] && !seededPairs[key]) {
          const pair = createFreshPair(riki.id, rival.id, world);
          pair.heat = rng.int(10, 25);
          pair.tone = rng.pick(["respect", "public_hype", "grudge"] as const);
          seededPairs[key] = pair;
        }
        builder.logEvent(
          "LIFECYCLE_EVENT",
          "rivalry",
          {
            status: "exhibition_rivalry_seeded",
            description: `${riki.shikona} and ${rival.shikona} develop a budding rivalry during the ${bashoName} exhibition tour.`,
            rikishiId: riki.id,
            rivalId: rival.id,
            bashoName,
          },
          { rikishiId: riki.id, importance: "minor" }
        );
      }
    }
  }

  if (Object.keys(seededPairs).length > 0) {
    builder.updateWorldField("rivalriesState", {
      ...rivalriesOverlay,
      pairs: { ...rivalriesOverlay.pairs, ...seededPairs },
    });
  }

  return builder.build();
}
