import { SeededRNG } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult } from "../types/basho";

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

export const VENUE_PROFILES: Record<string, { shortName: string; venue: string; crowdStyle: CrowdStyle }> = {
  Tokyo: { shortName: "Ryōgoku", venue: "Ryōgoku Kokugikan", crowdStyle: "restrained" },
  Osaka: { shortName: "Osaka", venue: "Edion Arena Osaka", crowdStyle: "responsive" },
  Nagoya: { shortName: "Nagoya", venue: "Aichi Prefectural Gymnasium", crowdStyle: "responsive" },
  Fukuoka: { shortName: "Fukuoka", venue: "Fukuoka Kokusai Center", crowdStyle: "intimate" }
};
