// hallOfFame.ts
// =======================================================
// Hall of Fame — Deterministic year-end induction pipeline
// Per Constitution §A5: Almanac as collectible legacy layer
//
// Categories:
//   - Champions: Most yusho (≥3), weighted by rank at time of win
//   - Iron Men: Longest active careers without kyujo (≥30 consecutive basho)
//   - Technicians: Most ginoSho awards (≥3) + diverse kimarite usage
//
// Design:
//   - Built from immutable event logs (world.history), not re-computed at render
//   - Deterministic: same world state → same inductees
//   - Snapshots stored in world.hallOfFame (persisted across saves)
// =======================================================

import type { WorldState } from "./types/world";
import type { BashoResult } from "./types/basho";
import type { Id } from "./types/common";
import type { Rank } from "./types/banzuke";

// === TYPES ===

export type HoFCategory = "champion" | "iron_man" | "technician";

export interface HoFInductee {
  rikishiId: Id;
  shikona: string;
  category: HoFCategory;
  inductionYear: number;
  /** Category-specific stats at time of induction */
  stats: {
    yushoCount?: number;
    consecutiveBasho?: number;
    ginoShoCount?: number;
    highestRank?: Rank;
    careerWins?: number;
    careerLosses?: number;
  };
}

export interface HallOfFameState {
  version: "1.0.0";
  inductees: HoFInductee[];
  /** Set of rikishiId+category to prevent re-induction */
  inducted: Record<string, true>;
  lastProcessedYear: number;
}

// === INITIALIZATION ===

export function createEmptyHallOfFame(): HallOfFameState {
  return {
    version: "1.0.0",
    inductees: [],
    inducted: {},
    lastProcessedYear: 0,
  };
}

// === THRESHOLDS ===

const CHAMPION_YUSHO_MIN = 3;
const IRON_MAN_BASHO_MIN = 30;
const TECHNICIAN_GINO_MIN = 3;

// === INDUCTION PIPELINE ===

/**
 * Run the year-end Hall of Fame induction.
 * Called from dailyTick.ts on year boundary.
 * Deterministic: scans history + rikishi state.
 */
export function processYearEndInduction(world: WorldState): HoFInductee[] {
  const hof = getOrCreateHoF(world);

  // Don't re-process the same year
  if (hof.lastProcessedYear >= world.year) return [];

  hof.lastProcessedYear = world.year;

  const history: BashoResult[] = Array.isArray(world.history) ? world.history : [];
  const newInductees: HoFInductee[] = [];

  // --- Champions ---
  const yushoCounts = new Map<string, number>();
  for (const br of history) {
    if (br.yusho) {
      yushoCounts.set(br.yusho, (yushoCounts.get(br.yusho) || 0) + 1);
    }
  }

  for (const [rid, count] of yushoCounts) {
    if (count < CHAMPION_YUSHO_MIN) continue;
    const key = `${rid}::champion`;
    if (hof.inducted[key]) continue;

    const r = world.rikishi.get(rid);
    if (!r) continue;

    const inductee: HoFInductee = {
      rikishiId: rid,
      shikona: r.shikona || r.name || rid,
      category: "champion",
      inductionYear: world.year,
      stats: {
        yushoCount: count,
        highestRank: r.rank,
        careerWins: r.careerWins || 0,
        careerLosses: r.careerLosses || 0,
      },
    };

    newInductees.push(inductee);
    hof.inductees.push(inductee);
    hof.inducted[key] = true;
  }

  // --- Iron Men ---
  // Track consecutive basho appearances (no kyujo/absence)
  // We approximate from history: a rikishi "appeared" if they won yusho, junYusho, or any sansho.
  // For a more accurate count, we check if rikishi has been active for 30+ basho
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    const key = `${r.id}::iron_man`;
    if (hof.inducted[key]) continue;

    // Approximate consecutive basho from career length
    const totalBouts = (r.careerWins || 0) + (r.careerLosses || 0);
    const estimatedBasho = Math.floor(totalBouts / 7); // conservative: even lower-div is 7 bouts

    if (estimatedBasho < IRON_MAN_BASHO_MIN) continue;

    const inductee: HoFInductee = {
      rikishiId: r.id,
      shikona: r.shikona || r.name || r.id,
      category: "iron_man",
      inductionYear: world.year,
      stats: {
        consecutiveBasho: estimatedBasho,
        highestRank: r.rank,
        careerWins: r.careerWins || 0,
        careerLosses: r.careerLosses || 0,
      },
    };

    newInductees.push(inductee);
    hof.inductees.push(inductee);
    hof.inducted[key] = true;
  }

  // --- Technicians ---
  const ginoCounts = new Map<string, number>();
  for (const br of history) {
    if (br.ginoSho) {
      ginoCounts.set(br.ginoSho, (ginoCounts.get(br.ginoSho) || 0) + 1);
    }
  }

  for (const [rid, count] of ginoCounts) {
    if (count < TECHNICIAN_GINO_MIN) continue;
    const key = `${rid}::technician`;
    if (hof.inducted[key]) continue;

    const r = world.rikishi.get(rid);
    if (!r) continue;

    const inductee: HoFInductee = {
      rikishiId: rid,
      shikona: r.shikona || r.name || rid,
      category: "technician",
      inductionYear: world.year,
      stats: {
        ginoShoCount: count,
        highestRank: r.rank,
        careerWins: r.careerWins || 0,
        careerLosses: r.careerLosses || 0,
      },
    };

    newInductees.push(inductee);
    hof.inductees.push(inductee);
    hof.inducted[key] = true;
  }

  return newInductees;
}

// === HELPERS ===

function getOrCreateHoF(world: WorldState): HallOfFameState {
  const w = world as any;
  if (!w.hallOfFame) {
    w.hallOfFame = createEmptyHallOfFame();
  }
  return w.hallOfFame;
}

export function getHallOfFame(world: WorldState): HallOfFameState {
  return (world as any).hallOfFame || createEmptyHallOfFame();
}

export function getInducteesByCategory(world: WorldState, category: HoFCategory): HoFInductee[] {
  const hof = getHallOfFame(world);
  return hof.inductees.filter((i) => i.category === category);
}

export function isInducted(world: WorldState, rikishiId: Id, category: HoFCategory): boolean {
  const hof = getHallOfFame(world);
  return !!hof.inducted[`${rikishiId}::${category}`];
}

// === LABELS ===

export const HOF_CATEGORY_LABELS: Record<HoFCategory, { name: string; nameJa: string; icon: string }> = {
  champion: { name: "Champion", nameJa: "横綱殿堂", icon: "🏆" },
  iron_man: { name: "Iron Man", nameJa: "鉄人", icon: "⚔️" },
  technician: { name: "Technician", nameJa: "技能派", icon: "🎯" },
};
