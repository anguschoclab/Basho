/**
 * HeadlineGenerator.ts — Pure logic for constructing deterministic headline text.
 * All templates are sourced from archive.json via BardEngine.
 */

import { SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import { HeadlineTier } from "../../types/media";
import { BardEngine } from "../../bard/BardEngine";
import { getRikishi } from "../../queries";
import {
  MAIN_EVENT_HEADLINE_CHANCE,
  STREAK_HEADLINE_THRESHOLD,
  STREAK_SECONDARY_THRESHOLD,
} from "../../../constants/engine/media";

export function generateBoutHeadline(args: {
  rng: SeededRNG;
  world: WorldState;
  winnerId: string;
  loserId: string;
  kimariteName: string;
  upset: boolean;
  tier: HeadlineTier;
}): { title: string; subtitle?: string } {
  const { rng, world, winnerId, loserId, kimariteName, upset, tier } = args;

  const winner = getRikishi(world, winnerId)?.shikona ?? "Unknown";
  const loser = getRikishi(world, loserId)?.shikona ?? "Unknown";
  const ctx = { winner, loser, kimarite: kimariteName };

  let titlePath: string;
  if (upset) {
    titlePath = "media.bout.upset";
  } else if (tier === "main_event" && rng.next() < MAIN_EVENT_HEADLINE_CHANCE) {
    titlePath = "media.bout.mainEvent";
  } else {
    titlePath = "media.bout.standard";
  }

  const title = BardEngine.resolve(rng, titlePath, ctx).text;

  let subtitle: string | undefined;
  if (upset) {
    subtitle = BardEngine.resolve(rng, "media.bout.subtitles.upset", ctx).text;
  } else if (tier === "main_event") {
    subtitle = BardEngine.resolve(rng, "media.bout.subtitles.mainEvent", ctx).text;
  }

  return { title, subtitle };
}

export function generateStreakHeadline(args: { rng: SeededRNG; shikona: string; streak: number }): {
  title: string;
  subtitle: string;
} {
  const { rng, shikona, streak } = args;
  const ctx = { shikona, streak };

  let titlePath: string;
  let subKey: string;

  if (streak >= STREAK_HEADLINE_THRESHOLD) {
    titlePath = "media.streaks.legendary";
    subKey = "legendary";
  } else if (streak >= STREAK_SECONDARY_THRESHOLD) {
    titlePath = "media.streaks.hot";
    subKey = "hot";
  } else {
    titlePath = "media.streaks.notable";
    subKey = "notable";
  }

  const title = BardEngine.resolve(rng, titlePath, ctx).text;
  const subtitle = BardEngine.resolve(rng, `media.streaks.subtitles.${subKey}`, ctx).text;

  return { title, subtitle };
}

export function generatePreBashoHeadline(args: {
  rng: SeededRNG;
  kind: "rivalryWatch" | "promotionRace" | "formWatch" | "titleFavorites";
  ctx: Record<string, string | number>;
}): { title: string; subtitle?: string } {
  const { rng, kind, ctx } = args;

  const title = BardEngine.resolve(rng, `media.preBasho.${kind}`, ctx).text;
  let subtitle: string | undefined;

  // Only some types have specific subtitles in the archive
  if (kind === "rivalryWatch" || kind === "promotionRace") {
    subtitle = BardEngine.resolve(rng, `media.preBasho.subtitles.${kind}`, ctx).text;
  }

  return { title, subtitle };
}
