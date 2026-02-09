// calendar.ts
// Basho Calendar System - Six authentic tournaments per year
//
// Canon fixes applied:
// - NO Math.random(): flavor selection is seeded/deterministic
// - Inter-basho is fixed at 6 weeks (canon bridge)
// - startDay is computed as the 2nd Sunday of the basho month (deterministic calendar rule)
// - Safe flavor selection: never crashes if seed is undefined / empty
//
// NOTE:
// If you want to override a specific basho start day, set `startDay` in BASHO_CALENDAR[name].

import type { BashoName, BashoInfo } from "./types";

// === BASHO CALENDAR ===
//
// startDay is computed via getSecondSunday(...) at runtime helpers;
// we store month/location/venue metadata here.

export const BASHO_CALENDAR: Record<BashoName, Omit<BashoInfo, "startDay"> & { startDay?: number }> = {
  hatsu: {
    name: "hatsu",
    nameJa: "初場所",
    nameEn: "New Year Tournament",
    month: 1,
    location: "Tokyo",
    venue: "Ryōgoku Kokugikan",
    venueJa: "両国国技館",
    season: "winter",
    description: "The first basho of the year, held in the new year spirit"
  },
  haru: {
    name: "haru",
    nameJa: "春場所",
    nameEn: "Spring Tournament",
    month: 3,
    location: "Osaka",
    venue: "Edion Arena Osaka",
    venueJa: "エディオンアリーナ大阪",
    season: "spring",
    description: "The spring basho held in Osaka, known for passionate local fans"
  },
  natsu: {
    name: "natsu",
    nameJa: "夏場所",
    nameEn: "Summer Tournament",
    month: 5,
    location: "Tokyo",
    venue: "Ryōgoku Kokugikan",
    venueJa: "両国国技館",
    season: "summer",
    description: "The summer basho returns to Tokyo's sumo heartland"
  },
  nagoya: {
    name: "nagoya",
    nameJa: "名古屋場所",
    nameEn: "Nagoya Tournament",
    month: 7,
    location: "Nagoya",
    // If your setting is “timeless”, keep the older venue string; determinism doesn’t care.
    venue: "Aichi Prefectural Gymnasium",
    venueJa: "愛知県体育館",
    season: "summer",
    description: "The midsummer basho, often the hottest and most grueling"
  },
  aki: {
    name: "aki",
    nameJa: "秋場所",
    nameEn: "Autumn Tournament",
    month: 9,
    location: "Tokyo",
    venue: "Ryōgoku Kokugikan",
    venueJa: "両国国技館",
    season: "autumn",
    description: "The autumn basho, traditionally when new stars emerge"
  },
  kyushu: {
    name: "kyushu",
    nameJa: "九州場所",
    nameEn: "Kyushu Tournament",
    month: 11,
    location: "Fukuoka",
    venue: "Fukuoka Kokusai Center",
    venueJa: "福岡国際センター",
    season: "autumn",
    description: "The year's final basho, held in southern Japan"
  }
};

// Basho order for iteration
export const BASHO_ORDER: BashoName[] = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"];

// Get basho by number (1-6)
export function getBashoByNumber(num: 1 | 2 | 3 | 4 | 5 | 6): BashoInfo {
  const name = BASHO_ORDER[num - 1];
  return getBashoInfo(name);
}

// Get next basho in sequence
export function getNextBasho(current: BashoName): BashoName {
  const idx = BASHO_ORDER.indexOf(current);
  return BASHO_ORDER[(idx + 1) % 6];
}

// Get basho index (0-5)
export function getBashoIndex(name: BashoName): number {
  return BASHO_ORDER.indexOf(name);
}

/**
 * Canon: inter-basho is a fixed 6-week bridge.
 * (Tournament is 15 days; between basho phase is modeled as 6 weeks.)
 */
export function getInterimWeeks(_from: BashoName, _to: BashoName): number {
  return 6;
}

/**
 * Returns fully-populated BashoInfo including deterministic startDay.
 * Rule: basho starts on the 2nd Sunday of its month by default (real-world style).
 * If you want to override a specific basho, set startDay in BASHO_CALENDAR[basho].startDay.
 */
export function getBashoInfo(name: BashoName, year?: number): BashoInfo {
  const base = BASHO_CALENDAR[name];
  const computedStartDay = base.startDay ?? getSecondSunday(year ?? 2026, base.month);
  return {
    ...(base as Omit<BashoInfo, "startDay">),
    startDay: computedStartDay
  };
}

// === Seasonal flavor text ===

export const SEASONAL_FLAVOR: Record<BashoInfo["season"], string[]> = {
  winter: [
    "Cold winds blow across the kokugikan as the new year begins.",
    "Steam rises from the chanko pots as rikishi prepare for the first basho.",
    "The fresh spirit of the new year fills the arena."
  ],
  spring: [
    "Cherry blossoms frame the arena as spring arrives.",
    "The Osaka crowds bring their passionate energy to every bout.",
    "Spring rain patters on the roof as the tournament unfolds."
  ],
  summer: [
    "Heat shimmers over the dohyo in the height of summer.",
    "Fans wave uchiwa as the temperature rises with the action.",
    "The summer sun beats down, testing the endurance of every rikishi."
  ],
  autumn: [
    "Autumn leaves drift past the kokugikan windows.",
    "The cooling air brings renewed vigor to the competition.",
    "As the year winds down, every bout carries extra weight."
  ]
};

/**
 * Deterministic seasonal flavor selection.
 * Caller should pass a seed (recommended: `${world.seed}-flavor-${year}-${bashoName}-${day}`).
 * SAFE: if seed is missing/undefined, we still return a deterministic option (index 0).
 */
export function getSeasonalFlavor(season: BashoInfo["season"], seed?: string): string {
  const options = SEASONAL_FLAVOR?.[season] ?? [];
  if (options.length === 0) return "";

  const idx = deterministicIndex(seed, options.length);
  return options[idx] ?? "";
}

// Tournament day names (for display)
export function getDayName(day: number): { dayNum: string; dayJa: string } {
  const dayNames: Record<number, string> = {
    1: "初日",
    7: "中日",
    8: "中日",
    14: "千秋楽前日",
    15: "千秋楽"
  };
  return {
    dayNum: `Day ${day}`,
    dayJa: dayNames[day] || `${day}日目`
  };
}

// Check if it's a key day (extra narrative weight)
export function isKeyDay(day: number): boolean {
  return day === 1 || day === 7 || day === 8 || day === 14 || day === 15;
}

// === Helpers ===

/**
 * Safe deterministic index generator.
 * - Accepts undefined seed (treats as empty string)
 * - Accepts any length (guards 0)
 */
function deterministicIndex(seed: string | undefined, length: number): number {
  const s = typeof seed === "string" ? seed : "";
  const len = Number.isFinite(length) ? Math.floor(length) : 0;
  if (len <= 0) return 0;

  // FNV-1a-ish tiny hash (deterministic, fast)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0) % len;
}

/**
 * Compute the 2nd Sunday of a given month/year (Gregorian) in local time.
 * Deterministic across environments that implement JS Date correctly.
 */
function getSecondSunday(year: number, month1to12: number): number {
  // JS Date months are 0–11
  const month = month1to12 - 1;
  const firstDay = new Date(year, month, 1);
  const firstDow = firstDay.getDay(); // 0=Sun
  const daysUntilSunday = (7 - firstDow) % 7;
  const firstSundayDate = 1 + daysUntilSunday;
  const secondSundayDate = firstSundayDate + 7;
  return secondSundayDate;
}
