/**
 * narrationFeed.ts
 *
 * Structured play-by-play feed logic for the broadcast-grade replay surface.
 * Keeps PbpLine metadata (phase / tags / voice) intact instead of flattening
 * to strings, classifies each line for display, attaches plain-language
 * explainers and stakes badges, and picks the stakes-led headline.
 */

import type { BoutResult } from "@/engine/types/basho";
import type { PbpLine, PbpTag } from "@/presenters/engineAccess";
import type { UIRikishi } from "@/presenters/uiModels";

/** Display classes for feed lines. */
export type FeedLineClass = "headline" | "action" | "gyoji" | "setup";

export interface FeedBadge {
  tag: PbpTag;
  label: string;
}

/** Gyoji calls and formal announcements get the green "referee" treatment. */
const GYOKI_PATTERN = /hakkeyoi|nokotta|gyoji|gunbai|shobu ari|matta/i;

const ACTION_PHASES = new Set([
  "tachiai",
  "engagement",
  "clinch",
  "momentum",
  "momentum_shift",
  "edge_crisis",
  "fatigue",
  "grip_transition",
  "counter_tactic",
  "counter",
]);

/** Tags that mark a line as part of the bout's headline story. */
const HEADLINE_TAGS = new Set<PbpTag>([
  "kinboshi",
  "ginboshi",
  "upset",
  "title_stakes",
  "yusho_race",
  "playoff",
  "kadoban",
  "kachi_koshi",
  "make_koshi",
  "ozeki_demotion",
  "dynasty",
  "milestone",
  "mono_ii",
]);

/** Badged tags → chip label. Order = display priority (max 3 shown). */
const BADGE_LABELS: ReadonlyArray<[PbpTag, string]> = [
  ["kinboshi", "KINBOSHI"],
  ["ginboshi", "GINBOSHI"],
  ["upset", "UPSET"],
  ["playoff", "PLAYOFF"],
  ["title_stakes", "TITLE STAKES"],
  ["yusho_race", "YUSHO RACE"],
  ["kadoban", "KADOBAN"],
  ["mono_ii", "MONO-II"],
  ["kensho", "KENSHO"],
  ["henka", "HENKA"],
  ["kachi_koshi", "KACHI-KOSHI"],
  ["make_koshi", "MAKE-KOSHI"],
  ["milestone", "MILESTONE"],
  ["streak", "STREAK"],
  ["debut", "DEBUT"],
];

/** Return the structured PbpLine[] for a result — never flattened strings. */
export function getNarrationPbp(
  result: BoutResult,
  east: UIRikishi,
  west: UIRikishi
): PbpLine[] {
  if (result.pbpLines && result.pbpLines.length > 0) {
    return result.pbpLines.filter((l) => l.text && l.text.length > 2);
  }

  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser = result.winnerRikishiId === east.id ? west : east;

  const lines: PbpLine[] = [
    {
      id: "fb-opening",
      text: `${east.shikona} (East) faces ${west.shikona} (West).`,
      phase: "opening",
      voice: "understated",
    },
    {
      id: "fb-ritual",
      text: "They crouch at the shikiri-sen. Silence falls.",
      phase: "ritual",
      voice: "understated",
    },
    {
      id: "fb-tachiai",
      text: "TACHIAI! The collision echoes through the hall.",
      phase: "tachiai",
      voice: "formal",
    },
    {
      id: "fb-momentum",
      text: `${winner.shikona} drives forward with relentless pressure.`,
      phase: "momentum",
      voice: "dramatic",
    },
    {
      id: "fb-edge",
      text: `${loser.shikona} cannot find an answer.`,
      phase: "edge_crisis",
    },
    {
      id: "fb-finish",
      text: `${winner.shikona} wins by ${result.kimariteName || "yorikiri"}!`,
      phase: "finish",
      voice: "dramatic",
    },
  ];
  if (result.upset) {
    lines.push({
      id: "fb-upset",
      text: "UPSET! The arena is in disbelief!",
      phase: "post_bout",
      voice: "dramatic",
      tags: ["upset"],
    });
  }
  if (result.isKinboshi) {
    lines.push({
      id: "fb-kinboshi",
      text: "KINBOSHI! The Yokozuna has been toppled!",
      phase: "post_bout",
      voice: "dramatic",
      tags: ["kinboshi", "upset"],
    });
  }
  return lines;
}

/** Classify a line for feed styling: headline / action / gyoji / setup. */
export function classifyLine(line: PbpLine): FeedLineClass {
  if (GYOKI_PATTERN.test(line.text)) return "gyoji";
  if (line.tags?.some((t) => HEADLINE_TAGS.has(t))) return "headline";
  if (line.voice === "dramatic" && (line.phase === "finish" || line.phase === "post_bout")) {
    return "headline";
  }
  if (line.phase && ACTION_PHASES.has(line.phase)) return "action";
  return "setup";
}

/** Plain-language explainer subline for jargon-bearing lines; null when obvious. */
export function explainerFor(line: PbpLine): string | null {
  const tags = line.tags ?? [];
  for (const tag of tags) {
    const explainer = TAG_EXPLAINERS[tag];
    if (explainer) return explainer;
  }
  if (line.phase === "ritual") {
    return "Pre-bout ritual — salt for purification, stamped feet to drive off evil spirits.";
  }
  if (line.phase === "edge_crisis") {
    return "One wrestler is a single step from the straw bales — out of the ring means a loss.";
  }
  if (line.phase === "mono_ii") {
    return "The five judges confer when the referee's decision is in doubt.";
  }
  if (line.phase === "bout_timeout") {
    return "The gyoji calls a pause — the wrestlers reset at the starting lines.";
  }
  if (line.phase === "kyujo") {
    return "A withdrawal — the wrestler sits out and forfeits the remaining bouts.";
  }
  return null;
}

const TAG_EXPLAINERS: Partial<Record<PbpTag, string>> = {
  kinboshi: "A maegashira defeating a yokozuna earns a gold-star win (kinboshi).",
  ginboshi: "A silver-star win — a lower-ranked rikishi defeats an ozeki.",
  upset: "The lower-ranked wrestler wins against the odds.",
  kadoban: "An ozeki with a losing record last tournament — another means demotion.",
  henka: "A sidestep at the initial charge — legal, but frowned on at the top ranks.",
  mono_ii: "The five judges confer when the referee's decision is in doubt.",
  kensho: "Sponsor envelopes ride on this bout — the winner takes the prize money.",
  yusho_race: "This result directly affects the championship race.",
  title_stakes: "The championship hangs on this bout.",
  playoff: "A playoff decides the tournament champion — regulation scores were level.",
  senshuraku: "The final day — every rank and prize is settled today.",
  kachi_koshi: "A winning record (8+ victories) secures promotion next tournament.",
  make_koshi: "A losing record means demotion next tournament.",
  ozeki_demotion: "Two straight losing records strip the ozeki of his rank.",
  debut: "First top-division appearance.",
  consecutive_kachi: "Extending a run of winning records.",
};

/** Badge chips for a line (max 3, ordered by display priority). */
export function badgesForLine(line: PbpLine): FeedBadge[] {
  if (!line.tags || line.tags.length === 0) return [];
  const out: FeedBadge[] = [];
  for (const [tag, label] of BADGE_LABELS) {
    if (line.tags.includes(tag)) {
      out.push({ tag, label });
      if (out.length >= 3) break;
    }
  }
  return out;
}

/** Stakes score for headline selection — higher wins; later index breaks ties. */
function stakesScore(line: PbpLine): number {
  let score = 0;
  for (const tag of line.tags ?? []) {
    if (tag === "kinboshi") score = Math.max(score, 100);
    else if (tag === "ginboshi") score = Math.max(score, 95);
    else if (tag === "upset") score = Math.max(score, 90);
    else if (tag === "playoff") score = Math.max(score, 90);
    else if (tag === "title_stakes") score = Math.max(score, 85);
    else if (tag === "yusho_race") score = Math.max(score, 80);
    else if (tag === "mono_ii") score = Math.max(score, 70);
    else if (tag === "kadoban") score = Math.max(score, 60);
    else if (tag === "milestone" || tag === "dynasty") score = Math.max(score, 50);
    else if (HEADLINE_TAGS.has(tag)) score = Math.max(score, 40);
  }
  if (line.voice === "dramatic") score += 10;
  if (line.phase === "finish") score += 8;
  if (line.phase === "post_bout" || line.phase === "ceremony" || line.phase === "award") score += 6;
  return score;
}

/** Stakes-led headline selection: the index of the line that sells the bout. */
export function selectHeadlineIndex(lines: PbpLine[]): number {
  if (lines.length === 0) return -1;
  let best = lines.length - 1;
  let bestScore = -1;
  for (let i = 0; i < lines.length; i++) {
    const s = stakesScore(lines[i]);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return best;
}

/** The window of feed entries visible at a given narration index (max `size`). */
export function feedWindow<T>(items: T[], activeIndex: number, size = 3): T[] {
  if (items.length === 0 || activeIndex < 0) return [];
  const clamped = Math.min(activeIndex, items.length - 1);
  return items.slice(Math.max(0, clamped - (size - 1)), clamped + 1);
}
