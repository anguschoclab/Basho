import type { Rank, Division } from "../../engine/types/banzuke";
import { RANK_HIERARCHY } from "../../engine/types/banzuke";

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

export function isSekitoriDivision(division: Division): boolean {
  return division === "makuuchi" || division === "juryo";
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
