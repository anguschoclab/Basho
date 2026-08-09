import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { Id } from "../types/common";
import type { BashoName, BoutResult, BashoResult, KeyBoutEntry } from "../types/basho";
import type { RikishiCareerRecord, NotableBoutEntry, NarrativeHighlight } from "./types";
import { MAX_NOTABLE_BOUTS, MAX_NARRATIVE_HIGHLIGHTS } from "./types";
import { extractNotableNarrativeLines, isNotableBout } from "../bout/boutNarrative";
import { getRikishi } from "../queries";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

export function createEmptyAlmanacRecord(rikishi: Rikishi): RikishiCareerRecord {
  return {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona,
    debutYear: rikishi.birthYear + 16,
    debutBasho: "hatsu",
    totalWins: rikishi.careerWins,
    totalLosses: rikishi.careerLosses,
    totalAbsences: 0,
    yushoCount: 0,
    junYushoCount: 0,
    sanshoCounts: { ginoSho: 0, kantosho: 0, shukunsho: 0 },
    kinboshiCount: 0,
    highestRank: rikishi.rank,
    highestRankNumber: rikishi.rankNumber,
    highestRankAchievedYear: undefined,
    ozekiRunCount: 0,
    bashoHistory: [],
    currentWinStreak: 0,
    longestWinStreak: 0,
    currentLossStreak: 0,
    isActive: !rikishi.isRetired,
    notableBouts: [],
    narrativeHighlights: [],
    promotionHistory: [],
  };
}

export function buildNotableBoutEntry(
  result: BoutResult,
  rikishiId: Id,
  world: WorldState,
  bashoName: BashoName,
  year: number,
  day: number
): NotableBoutEntry | null {
  const isWinner = result.winnerRikishiId === rikishiId;
  const isLoser = result.loserRikishiId === rikishiId;
  if (!isWinner && !isLoser) return null;

  const opponentId = isWinner ? result.loserRikishiId : result.winnerRikishiId;
  const opponent = getRikishi(world, opponentId);
  const opponentShikona = opponent?.shikona ?? "Unknown";

  const narrativeLines = extractNotableNarrativeLines(result.pbpLines ?? []);

  return {
    boutId: result.boutId,
    year,
    bashoName,
    day,
    opponentId,
    opponentShikona,
    winner: isWinner,
    kimarite: result.kimarite,
    isKinboshi: result.isKinboshi ?? false,
    isUpset: result.upset,
    isYushoRace: result.isYushoRace ?? false,
    excitementScore: result.excitementScore,
    narrativeLines,
  };
}

function milestoneToHighlight(m: NonNullable<Rikishi["milestones"]>[number]): NarrativeHighlight {
  const bashoMap: Record<number, BashoName> = {
    1: "hatsu",
    3: "haru",
    5: "natsu",
    7: "nagoya",
    9: "aki",
    11: "kyushu",
  };
  return {
    year: m.date.year,
    bashoName: bashoMap[m.date.month] ?? "hatsu",
    type: m.type as NarrativeHighlight["type"],
    text: m.description,
  };
}

function notableBoutToHighlights(entry: NotableBoutEntry): NarrativeHighlight[] {
  const highlights: NarrativeHighlight[] = [];
  if (entry.isKinboshi) {
    highlights.push({
      year: entry.year,
      bashoName: entry.bashoName,
      type: "kinboshi",
      text: `${entry.winner ? "Defeated" : "Lost to"} ${entry.opponentShikona} — Kinboshi`,
      boutId: entry.boutId,
    });
  }
  if (entry.isUpset) {
    highlights.push({
      year: entry.year,
      bashoName: entry.bashoName,
      type: "upset",
      text: `${entry.winner ? "Upset victory over" : "Upset loss to"} ${entry.opponentShikona}`,
      boutId: entry.boutId,
    });
  }
  if (entry.isYushoRace) {
    highlights.push({
      year: entry.year,
      bashoName: entry.bashoName,
      type: "yusho",
      text: `Yusho race bout vs ${entry.opponentShikona}`,
      boutId: entry.boutId,
    });
  }
  if (highlights.length === 0) {
    highlights.push({
      year: entry.year,
      bashoName: entry.bashoName,
      type: "dominant",
      text: `Notable bout vs ${entry.opponentShikona}`,
      boutId: entry.boutId,
    });
  }
  return highlights;
}

function sortMostRecentFirst<T extends { year: number; bashoName: BashoName }>(arr: T[]): T[] {
  const bashoOrder: BashoName[] = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"];
  return arr.slice().sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return bashoOrder.indexOf(b.bashoName) - bashoOrder.indexOf(a.bashoName);
  });
}

export function enrichAlmanacRecord(
  record: RikishiCareerRecord,
  world: WorldState,
  rikishi: Rikishi
): RikishiCareerRecord {
  const existingBoutIds = new Set((record.notableBouts ?? []).map((b) => b.boutId));
  const newNotableBouts: NotableBoutEntry[] = [];

  // Scan world.history for keyBouts involving this rikishi
  for (const bashoResult of world.history) {
    const keyBouts = (bashoResult as BashoResult & { keyBouts?: KeyBoutEntry[] }).keyBouts;
    if (!keyBouts) continue;
    for (const kb of keyBouts) {
      const bout = kb.bout;
      if (bout.winnerRikishiId !== rikishi.id && bout.loserRikishiId !== rikishi.id) continue;
      if (existingBoutIds.has(bout.boutId)) continue;

      const entry = buildNotableBoutEntry(
        bout,
        rikishi.id,
        world,
        bashoResult.bashoName,
        bashoResult.year,
        kb.day
      );
      if (entry) {
        newNotableBouts.push(entry);
        existingBoutIds.add(bout.boutId);
      }
    }
  }

  // Build narrative highlights from milestones
  const milestoneHighlights: NarrativeHighlight[] = (rikishi.milestones ?? []).map(
    milestoneToHighlight
  );

  // Build highlights from notable bouts
  const allNotableBouts = [...(record.notableBouts ?? []), ...newNotableBouts];
  const boutHighlights: NarrativeHighlight[] = allNotableBouts.flatMap(notableBoutToHighlights);

  // Combine and sort
  const allHighlights = [
    ...(record.narrativeHighlights ?? []),
    ...milestoneHighlights,
    ...boutHighlights,
  ];
  // Dedupe highlights by text+year
  const seenHighlights = new Set<string>();
  const dedupedHighlights = allHighlights.filter((h) => {
    const key = `${h.year}-${h.type}-${h.text}`;
    if (seenHighlights.has(key)) return false;
    seenHighlights.add(key);
    return true;
  });

  const sortedBouts = sortMostRecentFirst(allNotableBouts).slice(0, MAX_NOTABLE_BOUTS);
  const sortedHighlights = sortMostRecentFirst(dedupedHighlights).slice(
    0,
    MAX_NARRATIVE_HIGHLIGHTS
  );

  return {
    ...record,
    notableBouts: sortedBouts,
    narrativeHighlights: sortedHighlights,
  };
}

export function runAlmanacNarrativeUpdate(world: WorldState): StateImpact {
  const builder = createImpactBuilder("runAlmanacNarrativeUpdate");

  if (!world.currentBasho) return builder.build();

  const basho = world.currentBasho;
  const bashoName = basho.bashoName;
  const year = basho.year;
  const matches = basho.matches;

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;

    // Get or create almanacRecord
    let record = rikishi.almanacRecord;
    if (!record) {
      record = createEmptyAlmanacRecord(rikishi);
      record = enrichAlmanacRecord(record, world, rikishi);
    }

    // Scan matches for notable bouts involving this rikishi
    const existingBoutIds = new Set((record.notableBouts ?? []).map((b) => b.boutId));
    const newBouts: NotableBoutEntry[] = [];
    const newHighlights: NarrativeHighlight[] = [];

    for (const match of matches) {
      const result = match.result;
      if (!result) continue;
      if (result.winnerRikishiId !== rikishiId && result.loserRikishiId !== rikishiId) continue;

      const winnerRikishi = getRikishi(world, result.winnerRikishiId);
      const winnerCareerWins = winnerRikishi?.careerWins ?? 0;
      const lines = result.pbpLines ?? [];

      if (!isNotableBout(result, lines, winnerCareerWins)) continue;
      if (existingBoutIds.has(result.boutId)) continue;

      const entry = buildNotableBoutEntry(result, rikishiId, world, bashoName, year, match.day);
      if (entry) {
        newBouts.push(entry);
        existingBoutIds.add(result.boutId);
        newHighlights.push(...notableBoutToHighlights(entry));
      }
    }

    // Build highlights for new milestones (added this basho)
    const existingMilestoneIds = new Set(
      (record.narrativeHighlights ?? []).map((h) => `${h.year}-${h.type}-${h.text}`)
    );
    const newMilestoneHighlights: NarrativeHighlight[] = (rikishi.milestones ?? [])
      .filter((m) => m.date.year === year)
      .map(milestoneToHighlight)
      .filter((h) => !existingMilestoneIds.has(`${h.year}-${h.type}-${h.text}`));

    // Combine all
    const allBouts = [...(record.notableBouts ?? []), ...newBouts];
    const allHighlights = [
      ...(record.narrativeHighlights ?? []),
      ...newHighlights,
      ...newMilestoneHighlights,
    ];

    // Dedupe highlights
    const seenHighlights = new Set<string>();
    const dedupedHighlights = allHighlights.filter((h) => {
      const key = `${h.year}-${h.type}-${h.text}`;
      if (seenHighlights.has(key)) return false;
      seenHighlights.add(key);
      return true;
    });

    const sortedBouts = sortMostRecentFirst(allBouts).slice(0, MAX_NOTABLE_BOUTS);
    const sortedHighlights = sortMostRecentFirst(dedupedHighlights).slice(
      0,
      MAX_NARRATIVE_HIGHLIGHTS
    );

    // Only update if there are changes
    if (newBouts.length > 0 || newMilestoneHighlights.length > 0 || !rikishi.almanacRecord) {
      builder.updateRikishi(rikishiId, {
        almanacRecord: {
          ...record,
          notableBouts: sortedBouts,
          narrativeHighlights: sortedHighlights,
        },
      });
    }
  }

  return builder.build();
}
