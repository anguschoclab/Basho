/**
 * digestProjections.ts
 *
 * Projections for building weekly digest UI data.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { Id } from "../../engine/types/common";
import type { WorldState } from "../../engine/types/world";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { RivalryPairState } from "../../engine/rivalries";
import { queryEvents } from "../../engine/events";
import { generateH2HCommentary } from "../../engine/h2h";
import { BardEngine } from "../../engine/bard/BardEngine";
import { SeededRNG } from "../../engine/rng";
import { selectInjuredRikishi, selectRecentEvents } from "../selectors";
import { generateRecommendations } from "../../engine/advisor/AdvisorService";

/** Type representing digest kind. */
export type DigestKind =
  | "training"
  | "injury"
  | "recovery"
  | "salary"
  | "koenkai"
  | "expense"
  | "economy"
  | "scouting"
  | "narrative"
  | "advisor"
  | "generic";

/** Defines the structure for digest item. */
export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  detail?: string;
  rikishiId?: Id;
  heyaId?: Id;
}

/** Defines the structure for digest section. */
export interface DigestSection {
  id: string;
  title: string;
  items: DigestItem[];
}

/** Defines the structure for UI digest. */
export interface UIDigest {
  time: { label: string };
  headline: string;
  counts: {
    trainingEvents: number;
    injuries: number;
    recoveries: number;
    economy: number;
    scouting: number;
  };
  sections: DigestSection[];
}

/**
 * Label for world.
 */
export function labelForWorld(world: WorldState): string {
  const year = world.year ?? DEFAULT_START_YEAR;
  const week = world.week ?? 0;
  const phase = world.cyclePhase ?? "interim";
  return `${year} — Week ${week} (${phase})`;
}

/**
 * Build injury section for digest.
 */
export function buildInjurySection(world: WorldState): DigestSection | null {
  const injuryItems: DigestItem[] = selectInjuredRikishi(world).map((r) => {
    const injury = r.injury;
    return {
      id: `injury::${r.id}`,
      kind: "injury",
      title: `${r.shikona ?? r.name ?? r.id} injured`,
      detail: injury
        ? `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? 0}w remaining`
        : "Unknown injury",
      rikishiId: r.id,
    };
  });
  if (!injuryItems.length) return null;
  const sectionRng = new SeededRNG((world.seed || "section") + "_injuries");
  return {
    id: "injuries",
    title: BardEngine.resolve(sectionRng, "ui.digest.sections.injuries").text,
    items: injuryItems,
  };
}

/**
 * Build event sections for digest.
 */
export function buildEventSections(world: WorldState): DigestSection[] {
  const sections: DigestSection[] = [];
  const eventBuckets = selectRecentEvents(world);
  const mapEventToItem = (e: import("../../engine/events").EngineEvent): DigestItem => ({
    id: e.id,
    kind:
      e.category === "scouting"
        ? "scouting"
        : e.category === "economy" || e.category === "sponsor"
          ? "economy"
          : e.category === "training"
            ? "training"
            : "generic",
    title: e.title,
    detail: e.summary,
    rikishiId: e.rikishiId,
    heyaId: e.heyaId,
  });

  const narrativeItems = queryEvents(world, { category: "narrative" }).map((e) => ({
    ...mapEventToItem(e),
    kind: "narrative" as const,
  }));
  const trainingItems = eventBuckets.training
    .filter((e) => e.type !== "TRAINING_STAT_DELTA")
    .map(mapEventToItem);
  const scoutItems = eventBuckets.scouting.map(mapEventToItem);
  const econItems = eventBuckets.economy.map(mapEventToItem);

  const sectionRng = new SeededRNG((world.seed || "section") + "_" + world.week);
  if (narrativeItems.length)
    sections.push({ id: "narrative", title: "Internal Intelligence", items: narrativeItems });
  if (trainingItems.length)
    sections.push({
      id: "training",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.governance").text,
      items: trainingItems,
    });
  if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length)
    sections.push({
      id: "economy",
      title: BardEngine.resolve(sectionRng, "ui.digest.sections.economy").text,
      items: econItems,
    });

  return sections;
}

/**
 * Build headline for digest.
 */
export function buildHeadline(
  world: WorldState,
  matchupCount: number,
  injuryCount: number
): string {
  const rng = world.rng || new SeededRNG(world.seed || "weekly_digest");
  const basho = world.currentBasho;
  return basho && world.cyclePhase === "active_basho"
    ? BardEngine.resolve(rng, "ui.digest.status.basho_day", {
        DAY: (basho.day ?? 1).toString(),
        DETAIL: matchupCount ? "Key matchups highlighted." : "Tournament in progress.",
      }).text
    : injuryCount
      ? BardEngine.resolve(rng, "ui.digest.status.injured", {
          INJURY_COUNT: injuryCount.toString(),
        }).text
      : BardEngine.resolve(rng, "ui.digest.status.no_events").text;
}

/**
 * Build matchup items for digest.
 */
export function buildMatchupItems(world: WorldState): {
  items: DigestItem[];
  section?: DigestSection;
} {
  const matchupItems: DigestItem[] = [];
  const basho = world.currentBasho;
  if (basho && world.cyclePhase === "active_basho" && world.week > 1) {
    const day = basho.day ?? 1;
    let matchupCount = 0;
    for (const match of basho.matches || []) {
      if (match.day !== day) continue;
      if (matchupCount >= 3) break;
      matchupCount++;
      const eastId = match.eastRikishiId;
      const westId = match.westRikishiId;
      if (!eastId || !westId) continue;

      const east = world.rikishi.get(eastId);
      const west = world.rikishi.get(westId);
      if (!east || !west) continue;

      matchupItems.push({
        id: `matchup::${east.id}::${west.id}::d${day}`,
        kind: "generic",
        title: `${east.shikona ?? east.name} vs ${west.shikona ?? west.name}`,
        detail: generateH2HCommentary(east, west),
        rikishiId: east.id,
      });
    }
    if (matchupItems.length) {
      const sectionRng = new SeededRNG((world.seed || "section") + "_matchups");
      return {
        items: matchupItems,
        section: {
          id: "matchups",
          title: BardEngine.resolve(sectionRng, "ui.digest.sections.matchups").text,
          items: matchupItems,
        },
      };
    }
  }
  return { items: matchupItems };
}

/**
 * Build training report section from TRAINING_STAT_DELTA events.
 * Filters to current week and player's heya only.
 */
export function buildTrainingReportSection(world: WorldState): DigestSection | null {
  if (!world.playerHeyaId) return null;
  const thisWeek = world.week ?? 0;
  const events = queryEvents(world, {
    types: ["TRAINING_STAT_DELTA"],
    heyaId: world.playerHeyaId,
    limit: 40,
  });
  const items: DigestItem[] = events
    .filter((e) => e.week === thisWeek)
    .map((e) => ({
      id: e.id,
      kind: "training" as const,
      title: (e.data.shikona as string) ?? "Unknown",
      detail: e.summary || "",
      rikishiId: e.rikishiId,
      heyaId: e.heyaId,
    }));
  if (!items.length) return null;
  return {
    id: "training-report",
    title: "Training Report",
    items,
  };
}

/**
 * Build advisor recommendations section for digest.
 * Skipped during autonomous fast-forward to avoid overhead.
 */
export function buildAdvisorSection(world: WorldState): DigestSection | null {
  if (world._autonomousSim) return null;
  const recs = generateRecommendations(world);
  if (!recs.length) return null;
  const items: DigestItem[] = recs.map((r) => ({
    id: r.id,
    kind: "advisor",
    title: r.title,
    detail: r.detail,
    rikishiId: r.relatedEntityId,
    heyaId: world.playerHeyaId,
  }));
  return { id: "advisor", title: "Advisor Report", items };
}

/**
 * Build weekly digest.
 */
export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;

  const sections: DigestSection[] = [];
  const injurySection = buildInjurySection(world);
  if (injurySection) sections.push(injurySection);

  const matchupResult = buildMatchupItems(world);
  if (matchupResult.section) sections.push(matchupResult.section);

  const eventSections = buildEventSections(world);
  sections.push(...eventSections);

  // Advisor recommendations section
  const advisorSection = buildAdvisorSection(world);
  if (advisorSection) sections.push(advisorSection);

  // Training Report section (from TRAINING_STAT_DELTA events)
  const trainingReportSection = buildTrainingReportSection(world);
  if (trainingReportSection) sections.push(trainingReportSection);

  // Rivalry Highlights for pre-basho phase (C4)
  if (world.cyclePhase === "pre_basho") {
    const rivalriesState = world.rivalriesState;
    if (rivalriesState?.pairs) {
      const hotPairs = Object.values(rivalriesState.pairs)
        .filter((p: RivalryPairState) => p.heat >= 40)
        .sort((a: RivalryPairState, b: RivalryPairState) => b.heat - a.heat)
        .slice(0, 3);

      if (hotPairs.length > 0) {
        const rivalryItems: DigestItem[] = hotPairs.map((pair: RivalryPairState) => {
          const rA = world.rikishi.get(pair.aId);
          const rB = world.rikishi.get(pair.bId);
          return {
            id: `rivalry::${pair.key}`,
            kind: "narrative",
            title: `${rA?.shikona} vs ${rB?.shikona}`,
            detail: `Intense ${pair.tone} building up for the tournament. Heat: ${Math.round(pair.heat)}`,
            rikishiId: pair.aId,
          };
        });
        sections.push({ id: "rivalries", title: "Rivalry Highlights", items: rivalryItems });
      }
    }
  }

  const eventBuckets = selectRecentEvents(world);
  const headline = buildHeadline(
    world,
    matchupResult.items.length,
    injurySection?.items.length ?? 0
  );

  return {
    time: { label: labelForWorld(world) },
    headline,
    counts: {
      trainingEvents: eventBuckets.training.length,
      injuries: injurySection?.items.length ?? 0,
      recoveries: 0,
      economy: eventBuckets.economy.length,
      scouting: eventBuckets.scouting.length,
    },
    sections,
  };
}
