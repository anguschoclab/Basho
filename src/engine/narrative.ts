import { pick } from "./utils";
import { rngFromSeed, SeededRNG } from "./rng";
import type { BoutResult, BoutLogEntry, BashoName } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { Stance } from "./types/combat";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

import { 
  NarrativeContext, 
  CrowdStyle, 
  VoiceStyle, 
  VENUE_PROFILES 
} from "./narrative/narrativeContext";

import * as T from "./narrative/narrativeTemplates";

function getVoiceStyle(day: number, isHighStakes: boolean): VoiceStyle {
  if (day >= 13 || isHighStakes) return "dramatic";
  if (day <= 5) return "understated";
  return "formal";
}

function estimateKensho(east: Rikishi, west: Rikishi, day: number, rng: SeededRNG): { hasKensho: boolean; count: number; sponsorName: string | null } {
  const highestTier = Math.min(RANK_HIERARCHY[east.rank].tier, RANK_HIERARCHY[west.rank].tier);
  let baseChance = 0, baseCount = 0;

  if (highestTier <= 1) { baseChance = 0.95; baseCount = 15 + Math.floor(rng.next() * 20); }
  else if (highestTier <= 2) { baseChance = 0.85; baseCount = 8 + Math.floor(rng.next() * 12); }
  else if (highestTier <= 4) { baseChance = 0.7; baseCount = 4 + Math.floor(rng.next() * 8); }
  else if (highestTier <= 5) { baseChance = 0.5; baseCount = 2 + Math.floor(rng.next() * 4); }
  else { baseChance = 0.15; baseCount = 1 + Math.floor(rng.next() * 2); }

  if (day >= 13) { baseChance = Math.min(1, baseChance + 0.2); baseCount = Math.floor(baseCount * 1.3); }

  const hasKensho = rng.next() < baseChance;
  const sponsorName = hasKensho ? pick(T.KENSHO_SPONSORS, () => rng.next()) : null;
  return { hasKensho, count: hasKensho ? baseCount : 0, sponsorName };
}

function generateVenueFraming(ctx: NarrativeContext): string[] {
  const { day, venueShortName, voiceStyle } = ctx;
  if (voiceStyle === "dramatic") {
    if (day === 15) return [`Day Fifteen—senshuraku—here in ${venueShortName}. The air is electric.`];
    return [`Day ${day} in ${venueShortName}, and the crowd is already alive.`];
  }
  return [voiceStyle === "understated" ? `Day ${day} in ${venueShortName}. The early basho rhythm continues.` : `Day ${day} at ${venueShortName}.` ];
}

function generateRingEntrance(ctx: NarrativeContext): string[] {
  const { east, west, crowdStyle, isHighStakes } = ctx;
  if (crowdStyle === "intimate") return [`${east.shikona} steps onto the dohyo—greeted warmly.`, `${west.shikona} follows, expression tight.`];
  if (isHighStakes) return [`${east.shikona} approaches the dohyo. The hall stirs.`, `${west.shikona} rises. A ripple of anticipation.`];
  return [`${east.shikona} and ${west.shikona} take their marks.`];
}

function generateRitualElements(ctx: NarrativeContext): string[] {
  const { east, west, voiceStyle, rng } = ctx;
  const lines: string[] = [];
  if (voiceStyle !== "understated" || rng.next() < 0.5) {
    lines.push(`${east.shikona} casts the salt high.`);
    lines.push(`${west.shikona} follows suit.`);
  }
  return lines;
}

function generateTachiai(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, rng } = ctx;
  const winnerSide = (entry.data?.winner as "east" | "west") ?? "east";
  const winnerName = winnerSide === "east" ? east.shikona : west.shikona;
  const loserName = winnerSide === "east" ? west.shikona : east.shikona;
  const margin = (entry.data?.margin as number) ?? 0;

  if (voiceStyle === "dramatic") {
    const lines = ["The fan drops—*tachiai!*"];
    if (margin > 10) {
      lines.push(pick(T.TACHIAI_WINNER_PHRASES, () => rng.next()).replace("%WINNER%", winnerName).replace("%LOSER%", loserName));
      lines.push(pick(T.TACHIAI_LOSER_PHRASES, () => rng.next()).replace("%LOSER%", loserName));
    } else {
      lines.push(`${winnerName} finds the better of it.`);
    }
    return lines;
  }
  return ["The fan drops.", `${winnerName} wins the tachiai.`];
}

function generateClinch(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, rng } = ctx;
  const stance = (entry.data?.stance as Stance) ?? "no-grip";
  if (stance === "belt-dominant") {
    return [voiceStyle === "dramatic" ? pick(T.CLINCH_BELT_PHRASES, () => rng.next()) : "They secure the mawashi. Deep grip established."];
  }
  return [stance === "push-dominant" ? "Hands at the chest—pure oshi-zumo!" : "They struggle for position."];
}

function generateMomentum(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, result, rng } = ctx;
  const recovery = (entry.data?.recovery as boolean) ?? false;
  const winnerName = result.winner === "east" ? east.shikona : west.shikona;
  const loserName = result.winner === "east" ? west.shikona : east.shikona;

  if (recovery) {
    return [voiceStyle === "dramatic" ? pick(T.MOMENTUM_RECOVERY_PHRASES, () => rng.next()).replace("%NAME%", loserName) : `${loserName} survives the pressure.`];
  }
  return [voiceStyle === "dramatic" ? pick(T.MOMENTUM_PRESSURE_PHRASES, () => rng.next()).replace("%NAME%", winnerName) : `${winnerName} maintains pressure.`];
}

function generateFinish(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const { voiceStyle, east, west, result } = ctx;
  const winnerSide = (entry.data?.winner as "east" | "west") ?? result.winner;
  const winnerName = winnerSide === "east" ? east.shikona : west.shikona;
  const kimarite = entry.data?.kimariteName || result.kimariteName;
  return [voiceStyle === "dramatic" ? `${winnerName} drives through with **a textbook ${kimarite}!** Out!` : `${winnerName} executes by ${kimarite}.`];
}

export function generateNarrative(east: Rikishi, west: Rikishi, result: BoutResult, bashoName: BashoName, day: number, opts?: { hasKensho?: boolean; kenshoCount?: number; sponsorName?: string | null; }): string[] {
  const bashoInfo = BASHO_CALENDAR[bashoName];
  const location = bashoInfo?.location ?? "Tokyo";
  const venueProfile = VENUE_PROFILES[location] ?? VENUE_PROFILES["Tokyo"];
  const isHighStakes = RANK_HIERARCHY[east.rank].tier <= 2 || RANK_HIERARCHY[west.rank].tier <= 2 || day >= 13 || !!result.upset;
  const voiceStyle = getVoiceStyle(day, isHighStakes);
  const boutSeed = `${bashoName}-${day}-${east.id}-${west.id}-${result.kimarite}`;
  const rng = rngFromSeed(boutSeed, "narrative", "bout");
  const kensho = typeof opts?.hasKensho === "boolean" ? { hasKensho: opts.hasKensho, count: Math.floor(opts.kenshoCount ?? 0), sponsorName: opts.sponsorName ?? null } : estimateKensho(east, west, day, rng);

  const ctx: NarrativeContext = { rng, east, west, result, location, venue: venueProfile.venue, venueShortName: venueProfile.shortName, day, voiceStyle, crowdStyle: venueProfile.crowdStyle, isHighStakes, boutSeed, hasKensho: kensho.hasKensho, kenshoCount: kensho.count, sponsorName: kensho.sponsorName };

  const narrative: string[] = [
    ...generateVenueFraming(ctx),
    ...generateRingEntrance(ctx),
    ...generateRitualElements(ctx)
  ];

  result.log.forEach(entry => {
    if (entry.phase === "tachiai") narrative.push(...generateTachiai(ctx, entry));
    else if (entry.phase === "clinch") narrative.push(...generateClinch(ctx, entry));
    else if (entry.phase === "momentum") narrative.push(...generateMomentum(ctx, entry));
    else if (entry.phase === "finish") narrative.push(...generateFinish(ctx, entry));
  });

  narrative.push(pick(T.CLOSING_PHRASES, () => rng.next()).replace("%WINNER%", result.winner === "east" ? east.shikona : west.shikona).replace("%LOSER%", result.winner === "east" ? west.shikona : east.shikona));
  return narrative;
}