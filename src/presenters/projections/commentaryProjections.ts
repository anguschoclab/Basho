/**
 * commentaryProjections.ts — announcer-style commentary (T1.3).
 * Broadcast calls derived strictly from real BoutResult facts —
 * kimarite, upsets, kinboshi/ginboshi — never fabricated stats.
 */

import type { BoutResult } from "@/engine/types/basho";

/** Deterministic pick — commentary must be stable across renders. */
function pick<T>(arr: T[], salt: string): T {
  let h = 0;
  for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

const KINBOSHI_CALLS = [
  "Gold star! A kinboshi — the maegashira topples the champion!",
  "The crowd erupts — kinboshi awarded for downing the yokozuna!",
];
const UPSET_CALLS = ["A genuine upset on the dohyo!", "The rankings lied today — upset victory!"];
const FINISH_CALLS: [RegExp, string][] = [
  [/nagete|nage|sukuinage|uwatenage|shitatenage/, "A masterful throw to seal it!"],
  [/hineri|kakenage|kotenage/, "Beautiful twisting finish!"],
  [/oshi|tsuki|hataki|hikiotoshi/, "Overwhelming forward pressure!"],
  [/okuri|yori/, "Relentless chest-to-chest force!"],
];

export function generateAnnouncerLines(result: BoutResult): string[] {
  const lines: string[] = [];
  const salt = `${result.boutId}`;

  if (result.isKinboshi || result.awardFact === "kinboshi") {
    lines.push(pick(KINBOSHI_CALLS, salt));
  } else if (result.upset) {
    lines.push(pick(UPSET_CALLS, salt));
  }

  const k = (result.kimarite ?? result.kimariteName ?? "").toLowerCase();
  const finish = FINISH_CALLS.find(([re]) => re.test(k));
  const technique = result.kimariteName ?? result.kimarite;
  lines.push(finish ? `${finish[1]} — ${technique}.` : `Decided by ${technique}.`);

  if (result.awardFact === "ginboshi") {
    lines.push("A silver star too — top-division scalp outside the yokozuna.");
  }

  return lines;
}
