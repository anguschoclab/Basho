/**
 * HeadlineGenerator.ts — Pure logic for constructing deterministic headline text.
 */

import { SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { HeadlineTier } from "../../types/media";
import { MEDIA_GENERIC_TEMPLATES } from "./Templates";
import { seededPick } from "../../utils/random";

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
  
  const winner = world.rikishi.get(winnerId)?.shikona ?? "Unknown";
  const loser = world.rikishi.get(loserId)?.shikona ?? "Unknown";

  let titleTemplate: string;
  if (upset) {
    titleTemplate = seededPick(rng, MEDIA_GENERIC_TEMPLATES.bout.upset);
  } else if (tier === "main_event" && rng.next() < 0.4) {
    titleTemplate = seededPick(rng, MEDIA_GENERIC_TEMPLATES.bout.mainEvent);
  } else {
    titleTemplate = seededPick(rng, MEDIA_GENERIC_TEMPLATES.bout.standard);
  }

  const title = titleTemplate
    .replace(/{winner}/g, winner)
    .replace(/{loser}/g, loser)
    .replace(/{kimarite}/g, kimariteName);

  let subtitle: string | undefined;
  if (upset) {
    subtitle = seededPick(rng, MEDIA_GENERIC_TEMPLATES.bout.subtitles.upset);
  } else if (tier === "main_event") {
    subtitle = seededPick(rng, MEDIA_GENERIC_TEMPLATES.bout.subtitles.mainEvent);
  }

  return { title, subtitle };
}

export function generateStreakHeadline(args: {
  rng: SeededRNG;
  shikona: string;
  streak: number;
}): { title: string; subtitle: string } {
  const { rng, shikona, streak } = args;
  
  let pool: string[];
  let subtitle: string;

  if (streak >= 10) {
    pool = MEDIA_GENERIC_TEMPLATES.streaks.legendary;
    subtitle = "The entire division is watching. This is history in the making.";
  } else if (streak >= 8) {
    pool = MEDIA_GENERIC_TEMPLATES.streaks.hot;
    subtitle = "A kachi-koshi secured — but the momentum says there's more to come.";
  } else {
    pool = MEDIA_GENERIC_TEMPLATES.streaks.notable;
    subtitle = "Consistency is building into something the press can't ignore.";
  }

  const title = seededPick(rng, pool)
    .replace(/{shikona}/g, shikona)
    .replace(/{streak}/g, streak.toString());

  return { title, subtitle };
}
