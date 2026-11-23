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
  JUNGYO_FATIGUE_PER_TOUR_DAY,
  JUNGYO_SEASON_FATIGUE_MULT,
} from "@/constants/engine/exhibitionBasho";
import {
  isPostRevision,
  jsaJungyoStipendMultiplier,
  JUNGYO_TOUR_DAYS,
  JUNGYO_TOUR_DAYS_POST_REFORM,
} from "@/constants/engine/jsaEra";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
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
export interface ExhibitionBashoInfo {
  name: ExhibitionBashoName;
  displayName: string;
  month: number;
  location: string;
  isHonbasho: false;
  /** WS-14 — real tour length in days (~90/yr pre-2027, ~70s after). */
  tourDays: number;
  /** WS-14 — season the tour runs in (August summer is the dense gauntlet). */
  season: "winter" | "spring" | "summer" | "autumn";
  /** WS-14 — true when the 2027 JSA jungyo reduction applies. */
  reformApplied: boolean;
}

/** Calendar month → jungyo season. */
function jungyoSeason(month: number): "winter" | "spring" | "summer" | "autumn" {
  if (month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

/**
 * Generate exhibition basho events that occur between honbasho.
 * Returns the jungyo events for a given year, inserted between the 6 honbasho.
 */
export function getExhibitionBashoSchedule(_year: number): ExhibitionBashoInfo[] {
  const events: Omit<ExhibitionBashoInfo, "tourDays" | "season" | "reformApplied">[] = [
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
  // WS-14 — tour granularity: real day counts (~90/yr, August gauntlet),
  // season tags, and the 2027 JSA recovery-package reduction.
  const reform = isPostRevision(_year);
  const daysTable = reform ? JUNGYO_TOUR_DAYS_POST_REFORM : JUNGYO_TOUR_DAYS;
  return events.map((e) => ({
    ...e,
    tourDays: daysTable[e.month] ?? 0,
    season: jungyoSeason(e.month),
    reformApplied: reform,
  }));
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
 * WS-14: tour length + season drive a real fatigue load on every participant.
 */
export function simulateExhibitionBasho(
  world: WorldState,
  jungyoEvent: ExhibitionBashoName | Pick<ExhibitionBashoInfo, "name" | "tourDays" | "season">,
  participants: Rikishi[]
): StateImpact {
  const builder = createImpactBuilder("simulateExhibitionBasho");
  const bashoName = typeof jungyoEvent === "string" ? jungyoEvent : jungyoEvent.name;
  const tourDays = typeof jungyoEvent === "string" ? 0 : jungyoEvent.tourDays;
  const season = typeof jungyoEvent === "string" ? undefined : jungyoEvent.season;
  const rng = rngForWorld(world, "exhibition", bashoName);

  // Rivalry seeds accumulate into a single overlay — writing the worldField
  // inside the loop would last-win clobber earlier seeds (each update is a
  // whole-object snapshot computed from the same base world).
  const rivalriesOverlay = ensureRivalriesState(world);
  const seededPairs: typeof rivalriesOverlay.pairs = {};

  // Eligible-rival lists are heya-invariant (rivals must be from a different
  // stable, and unique ids make the self-exclusion redundant) — cache one
  // filtered list per heya instead of re-filtering per rikishi.
  const rivalsByHeya = new Map<Rikishi["heyaId"], Rikishi[]>();
  const othersFor = (riki: Rikishi): Rikishi[] => {
    let others = rivalsByHeya.get(riki.heyaId);
    if (!others) {
      others = participants.filter((r) => r.heyaId !== riki.heyaId);
      rivalsByHeya.set(riki.heyaId, others);
    }
    return others;
  };

  for (const riki of participants) {
    if (riki.isRetired) continue;

    // Partial stipend — the 2027 JSA package raises jungyo allowances
    // ~20-50% by rank (jsaJungyoStipendMultiplier is the midpoint proxy).
    const baseStipend = EXHIBITION_BASE_STIPEND;
    const stipend = Math.round(
      baseStipend * jsaJungyoStipendMultiplier(world.year ?? DEFAULT_START_YEAR)
    );
    if (riki.economics) {
      builder.updateRikishi(riki.id, {
        economics: {
          ...riki.economics,
          cash: (riki.economics.cash ?? 0) + stipend,
        },
      });
    }

    // WS-14 — travel load: every participant carries fatigue proportional
    // to the real tour length, season-scaled (the August gauntlet is the
    // dangerous one). Feeds the fatigue → injury-chance coupling in
    // InjuryService and the condition pipelines downstream.
    if (tourDays > 0) {
      const load = Math.round(
        tourDays * JUNGYO_FATIGUE_PER_TOUR_DAY * (JUNGYO_SEASON_FATIGUE_MULT[season ?? "spring"] ?? 1)
      );
      if (load > 0) {
        builder.updateRikishi(riki.id, {
          fatigue: Math.min(100, (riki.fatigue ?? 0) + load),
        });
      }
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
      const others = othersFor(riki);
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
