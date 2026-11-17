/**
 * Era-keyed JSA compensation schedule.
 *
 * The JSA's 2026-07-30 board revision — announced just after the Nagoya
 * basho — doubled yusho prize money (first revision in 33 years) and raised
 * sekitori salaries ~10%, effective from the January 2027 tournament. The
 * sim starts 2026-01-01, so `year <= 2026` uses the legacy schedule and
 * `year >= 2027` uses the revised one.
 *
 * Sources: Hochi Shimbun / Nikkansports 2026-07-30; JSA official site;
 * Shukan Playboy 2026-11 compensation breakdown; ja.wikipedia 力士#報酬.
 */

import type { Division, Rank } from "@/engine/types/banzuke";

/** First calendar year the July-2026 JSA revision applies to (Hatsu 2027). */
export const JSA_REVISION_YEAR = 2027;

const isPostRevision = (year: number) => year >= JSA_REVISION_YEAR;

/** Sekitori monthly salary by rank: 2026 schedule → 2027+ schedule. */
const SEKITORI_SALARY: Record<string, [number, number]> = {
  yokozuna: [3_000_000, 3_300_000],
  ozeki: [2_500_000, 2_750_000],
  sekiwake: [1_800_000, 2_000_000],
  komusubi: [1_800_000, 2_000_000],
  maegashira: [1_400_000, 1_550_000],
  juryo: [1_100_000, 1_200_000],
};

/** Monthly salary for a rank in `year` (0 for non-sekitori). */
export function jsaSekitoriSalary(rank: Rank | string, year: number): number {
  const pair = SEKITORI_SALARY[rank];
  if (!pair) return 0;
  return pair[isPostRevision(year) ? 1 : 0];
}

/** Divisional yusho prize: 2026 schedule → 2027+ schedule. */
const YUSHO_PRIZE: Record<string, [number, number]> = {
  makuuchi: [10_000_000, 20_000_000],
  juryo: [2_000_000, 3_000_000],
  makushita: [500_000, 700_000],
  sandanme: [300_000, 500_000],
  jonidan: [200_000, 300_000],
  jonokuchi: [100_000, 200_000],
};

export function jsaYushoPrize(division: Division | string, year: number): number {
  const pair = YUSHO_PRIZE[division];
  if (!pair) return 0;
  return pair[isPostRevision(year) ? 1 : 0];
}

/** Sansho prize money (per award). */
export function jsaSanshoPrize(year: number): number {
  return isPostRevision(year) ? 3_000_000 : 2_000_000;
}

/** Non-sekitori per-basho allowance (場所手当) by division. */
const BASHO_TEATE: Record<string, [number, number]> = {
  makushita: [165_000, 180_000],
  sandanme: [110_000, 120_000],
  jonidan: [88_000, 95_000],
  jonokuchi: [77_000, 82_000],
};

export function jsaBashoTeate(division: Division | string, year: number): number {
  const pair = BASHO_TEATE[division];
  if (!pair) return 0;
  return pair[isPostRevision(year) ? 1 : 0];
}

/** 勝星金 — per-win payment for non-sekitori rikishi. */
const WIN_BONUS: Record<string, [number, number]> = {
  makushita: [3_500, 4_000],
  sandanme: [3_000, 3_500],
  jonidan: [2_500, 3_000],
  jonokuchi: [2_500, 3_000],
};

export function jsaWinBonus(division: Division | string, year: number): number {
  const pair = WIN_BONUS[division];
  if (!pair) return 0;
  return pair[isPostRevision(year) ? 1 : 0];
}

/** 勝ち越し金 — per net win (wins − losses) for non-sekitori rikishi. */
const KACHIKOSHI_BONUS: Record<string, [number, number]> = {
  makushita: [8_000, 10_000],
  sandanme: [6_500, 8_500],
  jonidan: [5_500, 7_500],
  jonokuchi: [5_500, 7_500],
};

export function jsaKachikoshiBonus(division: Division | string, year: number): number {
  const pair = KACHIKOSHI_BONUS[division];
  if (!pair) return 0;
  return pair[isPostRevision(year) ? 1 : 0];
}

/**
 * 本場所特別手当 — per-basho special allowance for sanyaku-and-above
 * (yokozuna ¥200,000, ozeki ¥150,000, sekiwake/komusubi ¥50,000).
 * Not reported as raised in the 2027 package, so a single schedule.
 * Pro-rated by days contested: 11+ → full, 6–10 → 2/3, ≤5 → 1/3, 0 → 0.
 */
const SANYAKU_BASHO_ALLOWANCE: Record<string, number> = {
  yokozuna: 200_000,
  ozeki: 150_000,
  sekiwake: 50_000,
  komusubi: 50_000,
};

export function jsaSanyakuBashoAllowance(rank: Rank | string, daysContested: number): number {
  const base = SANYAKU_BASHO_ALLOWANCE[rank] ?? 0;
  if (base === 0 || daysContested <= 0) return 0;
  if (daysContested >= 11) return base;
  if (daysContested >= 6) return Math.round((base * 2) / 3);
  return Math.round(base / 3);
}

/**
 * Jungyo stipend multiplier. The real 2027 package raises jungyo allowances
 * 20–50% by rank; the game's flat stipend gets a +30% midpoint bump.
 */
export function jsaJungyoStipendMultiplier(year: number): number {
  return isPostRevision(year) ? 0.39 : 0.3;
}
