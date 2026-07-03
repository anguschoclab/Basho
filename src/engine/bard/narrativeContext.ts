import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";
import { BASHO_CALENDAR } from "../calendar";
import { RANK_HIERARCHY } from "../banzuke";
import {
  HIGH_STAKES_TIER_THRESHOLD,
  KENSHO_DAY_THRESHOLD,
  VOICE_DRAMATIC_DAY_THRESHOLD,
  VOICE_UNDERSTATED_DAY_THRESHOLD,
} from "../../constants/engine/generation";

export type VoiceStyle = "formal" | "dramatic" | "understated";
export type CrowdStyle = "restrained" | "responsive" | "intimate";

export interface NarrativeContext {
  rng: SeededRNG;
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;
  location: string;
  venue: string;
  venueShortName: string;
  day: number;
  voiceStyle: VoiceStyle;
  crowdStyle: CrowdStyle;
  isHighStakes: boolean;
  boutSeed: string;
  hasKensho: boolean;
  kenshoCount: number;
  sponsorName: string | null;
}

export const VENUE_PROFILES: Record<
  string,
  { shortName: string; venue: string; crowdStyle: CrowdStyle }
> = {
  Tokyo: { shortName: "Ryōgoku", venue: "Ryōgoku Kokugikan", crowdStyle: "restrained" },
  Osaka: { shortName: "Osaka", venue: "Edion Arena Osaka", crowdStyle: "responsive" },
  Nagoya: { shortName: "Nagoya", venue: "Aichi Prefectural Gymnasium", crowdStyle: "responsive" },
  Fukuoka: { shortName: "Fukuoka", venue: "Fukuoka Kokusai Center", crowdStyle: "intimate" },
};

/**
 * Build a rich NarrativeContext for bout narrative generation.
 * Extracts venue, voice style, and stakes metadata from the basho and rikishi.
 */
export function buildNarrativeContext(
  east: Rikishi,
  west: Rikishi,
  result: BoutResult,
  bashoName: BashoName | undefined,
  day: number,
  rng: SeededRNG
): NarrativeContext {
  const bashoInfo = bashoName ? BASHO_CALENDAR[bashoName] : undefined;
  const location = bashoInfo?.location ?? "Tokyo";
  const venueProfile = VENUE_PROFILES[location] ?? VENUE_PROFILES["Tokyo"];
  const isHighStakes =
    RANK_HIERARCHY[east.rank].tier <= HIGH_STAKES_TIER_THRESHOLD ||
    RANK_HIERARCHY[west.rank].tier <= HIGH_STAKES_TIER_THRESHOLD ||
    day >= KENSHO_DAY_THRESHOLD ||
    !!result.upset;
  const voiceStyle: VoiceStyle =
    day >= VOICE_DRAMATIC_DAY_THRESHOLD || isHighStakes
      ? "dramatic"
      : day <= VOICE_UNDERSTATED_DAY_THRESHOLD
        ? "understated"
        : "formal";
  const boutSeed = `${bashoName ?? "exhibition"}-${day}-${east.id}-${west.id}-${result.kimarite}`;

  return {
    rng,
    east,
    west,
    result,
    location,
    venue: venueProfile.venue,
    venueShortName: venueProfile.shortName,
    day,
    voiceStyle,
    crowdStyle: venueProfile.crowdStyle,
    isHighStakes,
    boutSeed,
    hasKensho: result.kenshoEnvelopes > 0,
    kenshoCount: result.kenshoEnvelopes,
    sponsorName: null,
  };
}
