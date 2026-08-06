/**
 * recapProjections.ts
 *
 * Projections for the post-basho Recap screen.
 * Contains `selectKeyBouts` — curates highlight moments (yusho decider,
 * biggest upset, kinboshi) from the current basho's completed matches.
 */

import type { WorldState } from "../../engine/types/world";
import type { BashoName, BoutResult, KeyBoutEntry, MatchSchedule } from "../../engine/types/basho";
import type { Rikishi } from "../../engine/types/rikishi";
import { RANK_HIERARCHY } from "../../engine/types/banzuke";

// ── Types ───────────────────────────────────────────────────────────────────

export type KeyBoutLabel = "yusho_decider" | "biggest_upset" | "kinboshi";

export interface KeyBoutMoment {
  label: KeyBoutLabel;
  labelText: string;
  bout: BoutResult;
  day: number;
  bashoName: BashoName;
  eastRikishiId: string;
  westRikishiId: string;
}

const LABEL_TEXT: Record<KeyBoutLabel, string> = {
  yusho_decider: "Yusho-Deciding Bout",
  biggest_upset: "Biggest Upset",
  kinboshi: "Kinboshi — Gold Star",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getRankTier(rikishi: Rikishi): number {
  return RANK_HIERARCHY[rikishi.rank].tier * 100 + (rikishi.rankNumber ?? 0);
}

function makeMoment(
  label: KeyBoutLabel,
  match: MatchSchedule,
  bashoName: BashoName
): KeyBoutMoment {
  return {
    label,
    labelText: LABEL_TEXT[label],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    bout: match.result!,
    day: match.day,
    bashoName,
    eastRikishiId: match.eastRikishiId,
    westRikishiId: match.westRikishiId,
  };
}

// ── Selection ───────────────────────────────────────────────────────────────

/**
 * Curate up to 3 highlight moments from the current basho:
 * 1. Yusho decider (by drama label, then highest drama score, then last day-15 bout)
 * 2. Biggest upset (largest rank-tier differential)
 * 3. First kinboshi bout
 *
 * Each bout can only appear once (deduplication via usedBoutIds Set).
 */
export function selectKeyBouts(world: WorldState): KeyBoutMoment[] {
  // Primary path: currentBasho is still populated (during finalization)
  const basho = world.currentBasho;
  if (basho) {
    const moments = selectFromMatches(world, basho.matches, basho.bashoName);
    if (moments.length > 0) return moments;
  }

  // Fallback: currentBasho was cleared by publishBanzukeUpdate before recap render.
  // Reconstruct moments from persisted keyBouts in the last BashoResult.
  const lastBasho = world.history?.[world.history.length - 1];
  if (lastBasho?.keyBouts && lastBasho.keyBouts.length > 0) {
    return lastBasho.keyBouts.map((entry) => entryFromPersisted(entry, lastBasho.bashoName));
  }

  return [];
}

function entryFromPersisted(entry: KeyBoutEntry, bashoName: BashoName): KeyBoutMoment {
  return {
    label: entry.label,
    labelText: LABEL_TEXT[entry.label],
    bout: entry.bout,
    day: entry.day,
    bashoName,
    eastRikishiId: entry.eastRikishiId,
    westRikishiId: entry.westRikishiId,
  };
}

function selectFromMatches(
  world: WorldState,
  matches: MatchSchedule[],
  bashoName: BashoName
): KeyBoutMoment[] {
  const completed = matches.filter((m) => m.result != null);
  if (completed.length === 0) return [];

  const moments: KeyBoutMoment[] = [];
  const usedBoutIds = new Set<string>();

  // 1. Yusho decider
  const yushoDecider = completed.find(
    (m) =>
      m.day === 15 &&
      (m.dramaticContext?.label === "yusho_decider" ||
        m.result?.dramaticContext?.label === "yusho_decider")
  );

  let yushoMoment: KeyBoutMoment | null = null;

  if (yushoDecider) {
    yushoMoment = makeMoment("yusho_decider", yushoDecider, bashoName);
  } else {
    // Fallback: highest drama score across all completed bouts
    let bestScore = -1;
    let bestMatch: MatchSchedule | null = null;
    for (const m of completed) {
      const score = m.dramaticContext?.score ?? m.result?.dramaticContext?.score ?? 0;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = m;
      }
    }

    if (bestMatch && bestScore > 0) {
      yushoMoment = makeMoment("yusho_decider", bestMatch, bashoName);
    } else {
      // Fallback: last day-15 bout
      const day15Bouts = completed.filter((m) => m.day === 15);
      if (day15Bouts.length > 0) {
        yushoMoment = makeMoment("yusho_decider", day15Bouts[day15Bouts.length - 1], bashoName);
      }
    }
  }

  if (yushoMoment) {
    moments.push(yushoMoment);
    usedBoutIds.add(yushoMoment.bout.boutId);
  }

  // 2. Biggest upset (by rank tier differential)
  let bestUpsetDiff = -1;
  let bestUpsetMatch: MatchSchedule | null = null;

  for (const m of completed) {
    if (!m.result?.upset) continue;
    if (usedBoutIds.has(m.result.boutId)) continue;

    const eastR = world.rikishi.get(m.eastRikishiId);
    const westR = world.rikishi.get(m.westRikishiId);
    if (!eastR || !westR) continue;

    const diff = Math.abs(getRankTier(eastR) - getRankTier(westR));
    if (diff > bestUpsetDiff) {
      bestUpsetDiff = diff;
      bestUpsetMatch = m;
    }
  }

  if (bestUpsetMatch) {
    const moment = makeMoment("biggest_upset", bestUpsetMatch, bashoName);
    moments.push(moment);
    usedBoutIds.add(moment.bout.boutId);
  }

  // 3. First kinboshi
  const kinboshiMatch = completed.find(
    (m) => m.result?.isKinboshi && !usedBoutIds.has(m.result.boutId)
  );

  if (kinboshiMatch) {
    const moment = makeMoment("kinboshi", kinboshiMatch, bashoName);
    moments.push(moment);
    usedBoutIds.add(moment.bout.boutId);
  }

  return moments;
}
