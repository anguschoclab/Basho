import type { OzekiKadobanMap } from "./banzuke";
// uiDigest.ts
// =======================================================
// UI Digest — transforms engine/world state into a compact weekly report.
//
// IMPORTANT:
// - World uses Maps at runtime (IdMapRuntime), so iterate with .values()
//   and Array.from(...) to avoid Map iterator pitfalls in UI code.
// =======================================================

import type { WorldState } from "./types/world";
import { queryEvents } from "./events";
import { generateH2HCommentary } from "./h2h";
import { stableSort } from "./utils/sort";

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
  | "generic";

/** Defines the structure for digest item. */
export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  detail?: string;
  rikishiId?: string;
  heyaId?: string;
}

/** Defines the structure for digest section. */
export interface DigestSection {
  id: string;
  title: string;
  items: DigestItem[];
}

/** Defines the structure for u i digest. */
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
 *  * @param world - The World.
 *  * @returns The result.
 */
function labelForWorld(world: WorldState): string {
  const year = world.year ?? 2025;
  const week = world.week ?? 0;
  const phase = world.cyclePhase ?? "interim";
  return `${year} — Week ${week} (${phase})`;
}

/**
 * Build weekly digest.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;


  const sections: DigestSection[] = [];

  // --- Injuries ---
  const injuryItems: DigestItem[] = [];
  // ⚡ Bolt: iterate directly over IterableIterator instead of Array.from() to avoid large array allocation
  for (const r of stableSort(Array.from(world.rikishi.values()), x => (x as any).id || String(x))) {
    const injury = r.injury;
    if (injury?.isInjured) {
      injuryItems.push({
        id: `injury::${r.id}`,
        kind: "injury",
        title: `${r.shikona ?? r.name ?? r.id} injured`,
        detail: `${injury.severity ?? "unknown"} — ${injury.weeksRemaining ?? "?"}w remaining`,
        rikishiId: r.id,
      });
    }
  }
  if (injuryItems.length) {
    sections.push({ id: "injuries", title: "Injuries", items: injuryItems });
  }

  // --- Key matchup (during basho) ---
  const matchupItems: DigestItem[] = [];
  const basho = world.currentBasho;
  // In this codebase, the authoritative indicator of basho activity is world.cyclePhase.
  // The schedule is a flat array of MatchSchedule items with a day field.
  if (basho && world.cyclePhase === "active_basho") {
    const day = basho.day ?? basho.currentDay ?? 1;
    let matchupCount = 0;
    for (const match of basho.matches ?? []) {
      if ((match as any)?.day !== day) continue;
      if (matchupCount >= 3) break;
      matchupCount++;
      const eastId = match.eastRikishiId ?? match.rikishiEastId ?? match.eastId;
      const westId = match.westRikishiId ?? match.rikishiWestId ?? match.westId;
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
      sections.unshift({ id: "matchups", title: "Key Matchups", items: matchupItems });
    }
  }

  // --- Engine Events (Event Bus) ---
  const recentEvents = world.events?.log ? queryEvents(world, { limit: 120 }) : [];
  const thisWeek = (world.week ?? 0);
  // Show events from current week and previous week (accounts for tick timing)
  const econItems: DigestItem[] = [];
  const scoutItems: DigestItem[] = [];
  const govItems: DigestItem[] = [];
  const welfareItems: DigestItem[] = [];
  const trainingItems: DigestItem[] = [];
  const careerItems: DigestItem[] = [];
  const rivalryItems: DigestItem[] = [];

  for (const e of recentEvents) {
    if (e.week < thisWeek - 1 || e.week > thisWeek) continue;
    const item: DigestItem = {
      id: e.id,
      kind: e.category === "scouting" ? "scouting" : e.category === "economy" || e.category === "sponsor" ? "economy" : e.category === "training" ? "training" : "generic",
      title: e.title,
      detail: e.summary,
      rikishiId: e.rikishiId,
      heyaId: e.heyaId
    };

    if (e.category === "economy" || e.category === "sponsor") econItems.push({ ...item, kind: "economy" });
    else if (e.category === "scouting") scoutItems.push({ ...item, kind: "scouting" });
    else if (e.category === "training") trainingItems.push({ ...item, kind: "training" });
    else if (e.category === "career") careerItems.push(item);
    else if (e.category === "rivalry") rivalryItems.push(item);
    else if (e.type.startsWith("GOVERNANCE") || e.type.includes("SCANDAL") || e.category === "discipline") govItems.push(item);
    else if (e.category === "welfare" || e.type.startsWith("COMPLIANCE") || e.type.startsWith("WELFARE")) welfareItems.push(item);
  }

  if (trainingItems.length) sections.push({ id: "training", title: "Training", items: trainingItems });
  if (careerItems.length) sections.push({ id: "career", title: "Career Updates", items: careerItems });
  if (rivalryItems.length) sections.push({ id: "rivalries", title: "Rivalries", items: rivalryItems });
  if (welfareItems.length) sections.push({ id: "welfare", title: "Welfare & Compliance", items: welfareItems });
  if (govItems.length) sections.push({ id: "governance", title: "Governance", items: govItems });
  if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length) sections.push({ id: "economy", title: "Economy", items: econItems });

  const counts = {
    trainingEvents: trainingItems.length,
    injuries: injuryItems.length,
    recoveries: 0,
    economy: econItems.length,
    scouting: scoutItems.length,
  };

  const headline =
    basho && world.cyclePhase === "active_basho"
      ? `Basho Day ${basho.day ?? basho.currentDay ?? 1}: ${matchupItems.length ? "Key matchups highlighted." : "Tournament in progress."}`
      : injuryItems.length
        ? `${injuryItems.length} injury update${injuryItems.length === 1 ? "" : "s"} this week.`
        : "No major events recorded this week.";

  return {
    time: { label: labelForWorld(world) },
    headline,
    counts,
    sections,
  };
}

/** Defines the structure for ozeki run candidate. */
export interface OzekiRunCandidate {
  rikishi: Rikishi;
  recentWins: number; // wins over last 3 basho
  threshold: number; // typically 33
  progress: number; // percentage
  narrative: string;
}

/** Defines the structure for yokozuna candidate. */
export interface YokozunaCandidate {
  rikishi: Rikishi;
  recentYushos: number;
  recentJunYushos: number;
  consecutiveYushos: number;
  isStrong: boolean;
  narrative: string;
}

export function getOzekiRunCandidates(world: WorldState): OzekiRunCandidate[] {
  const candidates: OzekiRunCandidate[] = [];
  const playerHeyaId = world.playerHeyaId;

  for (const r of stableSort(Array.from(world.rikishi.values()), x => (x as any).id || String(x))) {
    // Ozeki run: sekiwake or komusubi with strong recent results
    if (r.rank !== "sekiwake" && r.rank !== "komusubi") continue;
    if (r.isRetired) continue;

    // Get last 3 basho results from history
    const history = world.historyIndex.rikishi[r.id] || [];
    const recent = history.slice(-3);
    if (recent.length < 1) continue;

    let recentWins = recent.reduce((sum, h) => sum + h.wins, 0);

    // Add current basho wins if active
    for (const e of world.banzuke.makuuchi) {
      if (e.id === r.id) {
        recentWins += e.wins;
        break;
      }
    }

    const threshold = 33;
    if (recentWins >= 20 || r.heyaId === playerHeyaId) {
      candidates.push({
        rikishi: r,
        recentWins,
        threshold,
        progress: Math.min(100, (recentWins / threshold) * 100),
        narrative: recentWins >= 33
          ? "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent."
          : recentWins >= 30
          ? "On the brink. A few more wins will secure the rank."
          : "Building a solid case, but needs a spectacular finish."
      });
    }
  }
  return candidates.sort((a, b) => b.recentWins - a.recentWins);
}

export function getYokozunaCandidates(world: WorldState): YokozunaCandidate[] {
  const candidates: YokozunaCandidate[] = [];

  for (const r of stableSort(Array.from(world.rikishi.values()), x => (x as any).id || String(x))) {
    if (r.rank !== "ozeki") continue;
    if (r.isRetired) continue;

    const history = world.historyIndex.rikishi[r.id] || [];
    // Only check the last two history items without slice allocating a new array
    let yushos = 0;
    let junYushos = 0;
    const len = history.length;
    for (let i = Math.max(0, len - 2); i < len; i++) {
      const h = history[i];
      if (h.yusho) yushos++;
      if (h.junYusho) junYushos++;
    }

    const isStrong = yushos >= 2 || (yushos >= 1 && junYushos >= 1);

    if (yushos >= 1 || junYushos >= 1 || r.heyaId === world.playerHeyaId) {
      let narrative = "Requires two consecutive yusho for promotion.";
      if (yushos >= 2) narrative = "Unanimous Yokozuna Deliberation Council recommendation expected.";
      else if (yushos === 1 && junYushos === 1) narrative = "Borderline case. The Council will scrutinize the quality of sumo.";
      else if (yushos === 1) narrative = "Secured one Yusho. Must win the current basho to complete the run.";

      candidates.push({
        rikishi: r,
        recentYushos: yushos,
        recentJunYushos: junYushos,
        consecutiveYushos: yushos,
        isStrong,
        narrative
      });
    }
  }
  return candidates;
}

export function getKadobanDrama(world: WorldState): Array<{ rikishi: Rikishi; narrative: string; isDemoted: boolean }> {
  const kadobanMap: OzekiKadobanMap = (world as any).ozekiKadoban ?? {};
  const entries: Array<{ rikishi: Rikishi; narrative: string; isDemoted: boolean }> = [];

  for (const [rid, status] of Object.entries(kadobanMap)) {
    if (!status.isKadoban && status.consecutiveMakeKoshi < 2) continue;

    const r = world.rikishi.get(rid);
    if (!r) continue;

    let wins = 0;
    let losses = 0;
    for (const e of world.banzuke.makuuchi) {
      if (e.id === rid) {
        wins = e.wins;
        losses = e.losses;
        break;
      }
    }
    const isDemoted = status.isKadoban && losses >= 8;

    let narrative = "Fighting for survival as Kadoban Ozeki.";
    if (isDemoted) narrative = "Failed to clear Kadoban. Demotion to Sekiwake confirmed.";
    else if (status.isKadoban && wins >= 8) narrative = "Cleared Kadoban. Retains Ozeki rank.";
    else if (status.consecutiveMakeKoshi === 1 && losses >= 8) narrative = "Second consecutive Make-Koshi. Will be Kadoban next basho.";
    else if (status.consecutiveMakeKoshi === 1) narrative = "In danger of falling to Kadoban status with another losing record.";

    entries.push({ rikishi: r, narrative, isDemoted });
  }
  return entries;
}
