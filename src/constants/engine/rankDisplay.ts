import type { Rank, Division } from "@/engine/types/banzuke";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";

export interface RankDisplayEntry {
  en: string;
  ja: string;
  abbr: string;
  tier: number;
  division: Division;
  isSanyaku: boolean;
  isSekitori: boolean;
  salary: number;
  fightsPerBasho: number;
}

const ABBREVIATIONS: Record<Rank, string> = {
  yokozuna: "Y",
  ozeki: "O",
  sekiwake: "S",
  komusubi: "K",
  maegashira: "M",
  juryo: "J",
  makushita: "Mk",
  sandanme: "Sd",
  jonidan: "Jd",
  jonokuchi: "Jk",
};

const EN_LABELS: Record<Rank, string> = {
  yokozuna: "Yokozuna",
  ozeki: "Ozeki",
  sekiwake: "Sekiwake",
  komusubi: "Komusubi",
  maegashira: "Maegashira",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi",
};

export const RANK_DISPLAY_REGISTRY: Record<Rank, RankDisplayEntry> = Object.fromEntries(
  (Object.keys(RANK_HIERARCHY) as Rank[]).map((rank) => {
    const info = RANK_HIERARCHY[rank];
    return [
      rank,
      {
        en: EN_LABELS[rank],
        ja: info.nameJa,
        abbr: ABBREVIATIONS[rank],
        tier: info.tier,
        division: info.division,
        isSanyaku: info.isSanyaku,
        isSekitori: info.isSekitori,
        salary: info.salary,
        fightsPerBasho: info.fightsPerBasho,
      },
    ];
  })
) as Record<Rank, RankDisplayEntry>;

export type RankLabel = { ja: string; en: string };

export const RANK_NAMES: Record<Rank, RankLabel> = Object.fromEntries(
  (Object.keys(RANK_DISPLAY_REGISTRY) as Rank[]).map((rank) => [
    rank,
    { ja: RANK_DISPLAY_REGISTRY[rank].ja, en: RANK_DISPLAY_REGISTRY[rank].en },
  ])
) as Record<Rank, RankLabel>;

export function getRankDisplayEntry(rank: string): RankDisplayEntry | undefined {
  return RANK_DISPLAY_REGISTRY[rank as Rank];
}

export function isSanyakuRank(rank: string): boolean {
  return RANK_HIERARCHY[rank as Rank]?.isSanyaku ?? false;
}

/**
 * True iff rank is komusubi or sekiwake — the junior sanyaku ranks below
 * ozeki/yokozuna. Distinct from `isSanyakuRank` (which includes the elite
 * pair): use this where "sanyaku but not the top two" is meant.
 */
export function isLowerSanyakuRank(rank: string): boolean {
  return rank === "komusubi" || rank === "sekiwake";
}

export function isSekitoriRank(rank: string): boolean {
  return RANK_HIERARCHY[rank as Rank]?.isSekitori ?? false;
}

export function getRanksByDivision(division: Division): Rank[] {
  return (Object.keys(RANK_HIERARCHY) as Rank[]).filter(
    (rank) => RANK_HIERARCHY[rank].division === division
  );
}

export function getDivisionOfRank(rank: string): Division | undefined {
  return RANK_HIERARCHY[rank as Rank]?.division;
}

export function isSekitoriDivision(division: Division | string | undefined): boolean {
  return division === "makuuchi" || division === "juryo";
}

/**
 * True iff rank is yokozuna or ozeki — the two elite ("top of sanyaku")
 * ranks. Centralizes the `r.rank === "yokozuna" || r.rank === "ozeki"`
 * idiom duplicated across matchmaking, drama, and narrative code.
 */
export function isYokozunaOrOzekiRank(rank: string): boolean {
  return rank === "yokozuna" || rank === "ozeki";
}

/**
 * All ranks ordered junior → senior (jonokuchi first, yokozuna last).
 * Canonical iteration order for promotion/progression arithmetic.
 */
export const RANKS_ASCENDING: readonly Rank[] = [
  "jonokuchi",
  "jonidan",
  "sandanme",
  "makushita",
  "juryo",
  "maegashira",
  "komusubi",
  "sekiwake",
  "ozeki",
  "yokozuna",
];

/**
 * Pure ordering ordinal — jonokuchi 0 → yokozuna 9 (index into
 * RANKS_ASCENDING). For ORDER ONLY: promotion steps, sorts, table lookups.
 * Never use for prestige/salary/strength weighting — those are nonlinear
 * domain weights and must stay named constants.
 */
export const RANK_ORDINAL: Record<Rank, number> = Object.fromEntries(
  RANKS_ASCENDING.map((r, i) => [r, i])
) as Record<Rank, number>;

/**
 * Seniority ordinal — yokozuna 0 → jonokuchi 9, identical to
 * `RANK_HIERARCHY[rank].tier - 1`. Unknown ranks return 10 (below junior),
 * matching the historical `?? 99`-style fallbacks once scaled.
 */
export function rankSeniority(rank: string): number {
  return (RANK_HIERARCHY[rank as Rank]?.tier ?? 11) - 1;
}

export const DIVISIONS: Division[] = [
  "makuuchi",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

export const DIVISION_NAMES: Record<Division, string> = {
  makuuchi: "Makuuchi",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi",
};
