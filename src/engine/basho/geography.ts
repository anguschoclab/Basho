/**
 * geography.ts — hometown-tier resolution and the bout-clone crowd bonus.
 *
 * Rikishi `origin` is prefecture-level; `BashoInfo.location` is a city.
 * `hometownTier` maps both onto the region tables so a Kumamoto native
 * hears the Kyushu crowd at the Fukuoka basho, and an Aichi native is
 * genuinely home at Nagoya (city → prefecture equivalence).
 */

import {
  BASHO_HOST,
  HOMETOWN_MENTAL_BONUS_HOME,
  HOMETOWN_MENTAL_BONUS_REGION,
  PREFECTURE_REGION,
  REGION_DISPLAY,
  type HomeRegion,
} from "@/constants/engine/geography";
import type { Rikishi } from "@/engine/types/rikishi";

/** "home" = host prefecture itself; "region" = same wider region. */
export type HometownTier = "home" | "region";

/**
 * Resolve a rikishi's hometown tier for a basho location.
 * Returns null for foreign origins, unknown cities, and out-of-region
 * prefectures — no crowd edge.
 */
export function hometownTier(
  origin: string | undefined,
  bashoLocation: string | undefined
): HometownTier | null {
  if (!origin || !bashoLocation) return null;
  const host = BASHO_HOST[bashoLocation];
  if (!host) return null;
  // Host-prefecture equivalence (Aichi ⇄ Nagoya) + literal city-name match.
  if (origin === host.prefecture || origin === bashoLocation) return "home";
  if (PREFECTURE_REGION[origin] === host.region) return "region";
  return null;
}

/** Display region for a rikishi origin (null when not a Japanese prefecture). */
export function originRegion(origin: string | undefined): HomeRegion | null {
  if (!origin) return null;
  return PREFECTURE_REGION[origin] ?? null;
}

/** Display region name for a basho host city (e.g. "Fukuoka" → "Kyūshū"). */
export function bashoRegionLabel(bashoLocation: string | undefined): string | null {
  const host = bashoLocation ? BASHO_HOST[bashoLocation] : undefined;
  return host ? REGION_DISPLAY[host.region] : null;
}

/**
 * Apply the home-crowd mental bonus to a bout clone.
 * Home prefecture gets the full +3% lift; same-region gets +1.5% — the
 * crowd still lifts a regional man, just less than the local hero.
 * Bout clone only — world state is untouched.
 */
export function applyHometownBonus(r: Rikishi, tier: HometownTier | null): Rikishi {
  if (!tier || !r.stats) return r;
  const bonus = tier === "home" ? HOMETOWN_MENTAL_BONUS_HOME : HOMETOWN_MENTAL_BONUS_REGION;
  return {
    ...r,
    stats: {
      ...r.stats,
      mental: Math.min(100, (r.stats.mental ?? 50) * (1 + bonus)),
    },
  };
}
