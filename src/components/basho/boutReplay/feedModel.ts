/**
 * feedModel.ts
 *
 * Pure helpers that turn a BoutResult's structured play-by-play lines into
 * the scrolling commentary feed rendered under the bout replay canvas.
 * Keeps phase/tags/voice metadata intact so the UI can style each entry.
 */

import type { BoutResult } from "@/engine/types/basho";
import type { PbpLine, PbpTag } from "@/presenters/engineAccess";
import type { UIRikishi } from "@/presenters/uiModels";

export type LineClass = "headline" | "gyoji" | "action" | "setup";
/** Back-compat alias — consumers import `FeedLineClass`. */
export type FeedLineClass = LineClass;

export interface LineBadge {
  label: string;
  tag: PbpTag;
}

/** Structured feed entries — preserves metadata the string[] version dropped. */
export function getNarrationPbp(result: BoutResult, east: UIRikishi, west: UIRikishi): PbpLine[] {
  const raw = result.pbpLines;
  if (raw && raw.length > 0) {
    return raw.filter((l) => l.text && l.text.length > 2);
  }

  const winner = result.winnerRikishiId === east.id ? east : west;
  const loser = result.winnerRikishiId === east.id ? west : east;
  const mk = (text: string, phase: PbpLine["phase"], tags?: PbpTag[]): PbpLine => ({
    text,
    id: `${result.boutId}-fb-${phase}-${text.slice(0, 8)}`,
    phase,
    tags,
  });

  const lines: PbpLine[] = [
    mk(`${east.shikona} (East) faces ${west.shikona} (West).`, "opening"),
    mk(`They crouch at the shikiri-sen. Silence falls.`, "ritual"),
    mk(`TACHIAI! The collision echoes through the hall.`, "tachiai"),
    mk(`${winner.shikona} drives forward with relentless pressure.`, "momentum"),
    mk(`${loser.shikona} cannot find an answer.`, "momentum"),
    mk(`${winner.shikona} wins by ${result.kimariteName || "yorikiri"}!`, "finish"),
  ];
  if (result.upset) lines.push(mk("UPSET! The arena is in disbelief!", "finish", ["upset"]));
  if (result.isKinboshi)
    lines.push(mk("KINBOSHI! The Yokozuna has been toppled!", "finish", ["kinboshi"]));
  return lines;
}

/** Roll the feed back `size` entries ending at `currentIdx` (inclusive). */
export function feedWindow(lines: PbpLine[], currentIdx: number, size = 3): PbpLine[] {
  if (lines.length === 0 || currentIdx < 0) return [];
  const end = Math.min(currentIdx, lines.length - 1);
  const start = Math.max(0, end - (size - 1));
  return lines.slice(start, end + 1);
}

const GYOJI_RE = /hakkeyoi|nokotta|gyoji|gunbai/i;
const ACTION_PHASES = new Set<PbpLine["phase"]>([
  "tachiai",
  "clinch",
  "engagement",
  "momentum",
  "momentum_shift",
  "edge_crisis",
  "finish",
  "grip_transition",
  "counter_tactic",
]);
const HEADLINE_TAGS = new Set<PbpTag>([
  "kinboshi",
  "ginboshi",
  "upset",
  "yusho_race",
  "title_stakes",
  "playoff",
  "mono_ii",
  "injury",
]);

export function classifyLine(line: PbpLine): LineClass {
  if (GYOJI_RE.test(line.text)) return "gyoji";
  if (line.tags?.some((t) => HEADLINE_TAGS.has(t)) || (line.voice === "dramatic" && line.phase === "finish"))
    return "headline";
  if (line.phase && ACTION_PHASES.has(line.phase)) return "action";
  return "setup";
}

/** Plain-language subline for lines a newcomer can't parse. */
export function explainerFor(line: PbpLine): string | null {
  const tags = line.tags ?? [];
  if (tags.includes("kinboshi")) return "A top-division rikishi beating a Yokozuna earns a prized gold star.";
  if (tags.includes("ginboshi")) return "A silver-star win over an Ozeki — nearly as prized as kinboshi.";
  if (tags.includes("kadoban")) return "An Ozeki below .500 two basho in a row is demoted — every win matters.";
  if (tags.includes("henka")) return "A sidestep at the charge — legal, but some fans consider it cheap.";
  if (tags.includes("mono_ii")) return "The ringside judges confer to overturn or confirm the referee's call.";
  if (tags.includes("yusho_race") || tags.includes("title_stakes"))
    return "This bout directly affects who takes the tournament title.";
  if (tags.includes("upset")) return "The heavy favorite just lost — a real shock for the crowd.";
  if (tags.includes("injury") || tags.includes("bout_injury" as PbpTag))
    return "An injury sustained in the ring can end a rikishi's tournament.";
  if (tags.includes("kachi_koshi")) return "Eight or more wins means a winning record — and usually promotion.";
  if (tags.includes("make_koshi")) return "A losing record — demotion looms on the next banzuke.";
  if (tags.includes("playoff")) return "Tied records are settled by an extra deciding bout.";
  if (line.phase === "ritual") return "Pre-bout ritual: salt for purity, a crouch, and a silent stare-down.";
  if (line.phase === "tachiai") return "The opening charge often decides the bout in under a second.";
  return null;
}

const BADGE_TAGS: Record<string, string> = {
  kinboshi: "KINBOSHI",
  ginboshi: "GINBOSHI",
  upset: "UPSET",
  kadoban: "KADOBAN",
  yusho_race: "YUSHO RACE",
  title_stakes: "TITLE STAKES",
  playoff: "PLAYOFF",
  henka: "HENKA",
  mono_ii: "MONO-II",
  grudge_match: "GRUDGE",
  rivalry: "RIVALRY",
  injury: "INJURY",
  kachi_koshi: "KACHI-KOSHI",
  make_koshi: "MAKE-KOSHI",
  senshuraku: "SENSHURAKU",
};

/** Tags worth surfacing as badge chips under a feed line. */
export function badgesForLine(line: PbpLine): LineBadge[] {
  return (line.tags ?? [])
    .filter((t) => t in BADGE_TAGS)
    .map((t) => ({ label: BADGE_TAGS[t], tag: t }));
}

/** Which line best carries the story of this bout (for a headline slot). */
export function selectHeadlineIndex(lines: PbpLine[]): number {
  if (lines.length === 0) return -1;
  const priority: PbpTag[] = ["kinboshi", "ginboshi", "upset", "title_stakes", "yusho_race", "playoff"];
  for (const tag of priority) {
    const idx = lines.findIndex((l) => l.tags?.includes(tag));
    if (idx >= 0) return idx;
  }
  return lines.length - 1;
}
