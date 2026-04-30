// @ts-nocheck
import { rngFromSeed, SeededRNG } from "./rng";
import type { BoutResult, BoutLogEntry, BashoName } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { Stance } from "./types/combat";
import { BASHO_CALENDAR } from "./calendar";
import { RANK_HIERARCHY } from "./banzuke";

import { NarrativeContext, VoiceStyle, VENUE_PROFILES } from "./narrative/narrativeContext";

import { BardEngine } from "./narrative/BardEngine";

function getIntensity(voiceStyle: VoiceStyle): number {
  if (voiceStyle === "dramatic") return 3;
  if (voiceStyle === "understated") return 1;
  return 2;
}

function estimateKensho(
  east: Rikishi,
  west: Rikishi,
  day: number,
  rng: SeededRNG
): { hasKensho: boolean; count: number; sponsorName: string | null } {
  const highestTier = Math.min(RANK_HIERARCHY[east.rank].tier, RANK_HIERARCHY[west.rank].tier);
  let baseChance = 0,
    baseCount = 0;

  if (highestTier <= 1) {
    baseChance = 0.95;
    baseCount = 15 + Math.floor(rng.next() * 20);
  } else if (highestTier <= 2) {
    baseChance = 0.85;
    baseCount = 8 + Math.floor(rng.next() * 12);
  } else if (highestTier <= 4) {
    baseChance = 0.7;
    baseCount = 4 + Math.floor(rng.next() * 8);
  } else if (highestTier <= 5) {
    baseChance = 0.5;
    baseCount = 2 + Math.floor(rng.next() * 4);
  } else {
    baseChance = 0.15;
    baseCount = 1 + Math.floor(rng.next() * 2);
  }

  if (day >= 13) {
    baseChance = Math.min(1, baseChance + 0.2);
    baseCount = Math.floor(baseCount * 1.3);
  }

  const hasKensho = rng.next() < baseChance;
  const sponsorName = hasKensho
    ? BardEngine.resolve(rng, "institutional.kensho_sponsors").text
    : null;
  return { hasKensho, count: hasKensho ? baseCount : 0, sponsorName };
}

function generateVenueFraming(ctx: NarrativeContext): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const location = ctx.location as string;
  const path = `world.venues.${location}.entrance`;

  const result = BardEngine.resolve(ctx.rng as SeededRNG, path, {
    ...ctx,
    intensity,
  });

  return [result.text];
}

function generateRingEntrance(ctx: NarrativeContext): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const resultEast = BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.ritual.entrance", {
    ...ctx,
    shikona: (ctx.east as Rikishi).shikona,
    intensity,
  });
  const resultWest = BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.ritual.entrance", {
    ...ctx,
    shikona: (ctx.west as Rikishi).shikona,
    intensity,
  });
  return [resultEast.text, resultWest.text];
}

function generateRitualElements(ctx: NarrativeContext): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const lines: string[] = [];
  if (ctx.voiceStyle !== "understated" || (ctx.rng as SeededRNG).next() < 0.5) {
    lines.push(
      BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.ritual.salt", {
        ...ctx,
        intensity,
        rikishi: (ctx.east as Rikishi).shikona,
      }).text
    );
    lines.push(
      BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.ritual.salt", {
        ...ctx,
        intensity,
        rikishi: (ctx.west as Rikishi).shikona,
      }).text
    );
  }
  return lines;
}

function generateTachiai(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const winnerSide = (entry.data?.winner as "east" | "west") ?? "east";
  const winnerName =
    winnerSide === "east" ? (ctx.east as Rikishi).shikona : (ctx.west as Rikishi).shikona;
  const loserName =
    winnerSide === "east" ? (ctx.west as Rikishi).shikona : (ctx.east as Rikishi).shikona;

  const result = BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.tachiai", {
    ...ctx,
    winner: winnerName,
    loser: loserName,
    intensity,
  });

  return [result.text];
}

function generateClinch(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const stance = (entry.data?.stance as Stance) ?? "no-grip";
  const path =
    stance === "belt-dominant" ? "combat.phases.clinch.belt" : "combat.phases.clinch.oshi";

  const result = BardEngine.resolve(ctx.rng as SeededRNG, path, { ...ctx, intensity });
  return [result.text];
}

function generateMomentum(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const recovery = (entry.data?.recovery as boolean) ?? false;
  const path = recovery ? "combat.phases.momentum.recovery" : "combat.phases.momentum.pressure";
  const winnerName =
    (ctx.result as BoutResult).winner === "east"
      ? (ctx.east as Rikishi).shikona
      : (ctx.west as Rikishi).shikona;
  const loserName =
    (ctx.result as BoutResult).winner === "east"
      ? (ctx.west as Rikishi).shikona
      : (ctx.east as Rikishi).shikona;

  const name = recovery ? loserName : winnerName;

  const result = BardEngine.resolve(ctx.rng as SeededRNG, path, { ...ctx, name, intensity });
  return [result.text];
}

function generateFinish(ctx: NarrativeContext, entry: BoutLogEntry): string[] {
  const intensity = getIntensity(ctx.voiceStyle as VoiceStyle);
  const winnerSide = (entry.data?.winner as "east" | "west") ?? (ctx.result as BoutResult).winner;
  const winnerName =
    winnerSide === "east" ? (ctx.east as Rikishi).shikona : (ctx.west as Rikishi).shikona;
  const kimarite = entry.data?.kimariteName || (ctx.result as BoutResult).kimariteName;

  const result = BardEngine.resolve(ctx.rng as SeededRNG, "combat.phases.finish.common", {
    ...ctx,
    winner: winnerName,
    kimarite,
    intensity,
  });
  return [result.text];
}

export function generateNarrative(
  east: Rikishi,
  west: Rikishi,
  result: BoutResult,
  bashoName: BashoName,
  day: number,
  opts?: { hasKensho?: boolean; kenshoCount?: number; sponsorName?: string | null }
): string[] {
  const bashoInfo = BASHO_CALENDAR[bashoName];
  const location = bashoInfo?.location ?? "Tokyo";
  const venueProfile = VENUE_PROFILES[location] ?? VENUE_PROFILES["Tokyo"];
  const isHighStakes =
    RANK_HIERARCHY[east.rank].tier <= 2 ||
    RANK_HIERARCHY[west.rank].tier <= 2 ||
    day >= 13 ||
    !!result.upset;
  const voiceStyle = day >= 13 || isHighStakes ? "dramatic" : day <= 5 ? "understated" : "formal";
  const boutSeed = `${bashoName}-${day}-${east.id}-${west.id}-${result.kimarite}`;
  const rng = rngFromSeed(boutSeed, "narrative", "bout");
  const kensho =
    typeof opts?.hasKensho === "boolean"
      ? {
          hasKensho: opts.hasKensho,
          count: Math.floor(opts.kenshoCount ?? 0),
          sponsorName: opts.sponsorName ?? null,
        }
      : estimateKensho(east, west, day, rng);

  const ctx: NarrativeContext = {
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
    hasKensho: kensho.hasKensho,
    kenshoCount: kensho.count,
    sponsorName: kensho.sponsorName,
  };

  const narrative: string[] = [
    ...generateVenueFraming(ctx),
    ...generateRingEntrance(ctx),
    ...generateRitualElements(ctx),
  ];

  result.log.forEach((entry) => {
    if (entry.phase === "tachiai") narrative.push(...generateTachiai(ctx, entry));
    else if (entry.phase === "clinch") narrative.push(...generateClinch(ctx, entry));
    else if (entry.phase === "momentum") narrative.push(...generateMomentum(ctx, entry));
    else if (entry.phase === "finish") narrative.push(...generateFinish(ctx, entry));
  });

  const intensity = getIntensity(voiceStyle);
  const closingResult = BardEngine.resolve(rng, "combat.phases.finish.dramatic", {
    ...ctx,
    winner: result.winner === "east" ? east.shikona : west.shikona,
    loser: result.winner === "east" ? west.shikona : east.shikona,
    intensity,
  });

  narrative.push(closingResult.text);
  return narrative;
}
