// uiDigest.ts
// =======================================================
// UI Digest — transforms engine/world state into a compact weekly report.
//
// IMPORTANT:
// - World uses Maps at runtime (IdMapRuntime), so iterate with .values()
//   and Array.from(...) to avoid Map iterator pitfalls in UI code.
// =======================================================

import type { WorldState } from "./types";
import { queryEvents } from "./events";
import { generateH2HCommentary } from "./h2h";

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

export interface DigestItem {
  id: string;
  kind: DigestKind;
  title: string;
  detail?: string;
  rikishiId?: string;
  heyaId?: string;
}

export interface DigestSection {
  id: string;
  title: string;
  items: DigestItem[];
}

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

function labelForWorld(world: WorldState): string {
  const year = world.year ?? 2024;
  const week = world.week ?? 0;
  const phase = world.cyclePhase ?? "interim";
  return `${year} — Week ${week} (${phase})`;
}

export function buildWeeklyDigest(world: WorldState | null): UIDigest | null {
  if (!world) return null;

  const rikishiList = Array.from(world.rikishi.values());
  const heyaList = Array.from(world.heyas.values());

  const sections: DigestSection[] = [];

  // --- Injuries ---
  const injuryItems: DigestItem[] = [];
  for (const r of rikishiList) {
    const injury = (r as any).injury;
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
    const day = basho.day ?? (basho as any).currentDay ?? 1;
    const todays = (basho.matches ?? []).filter((m: any) => m?.day === day);

    for (const match of todays.slice(0, 3)) {
      const eastId = (match as any).eastRikishiId ?? (match as any).rikishiEastId ?? (match as any).eastId;
      const westId = (match as any).westRikishiId ?? (match as any).rikishiWestId ?? (match as any).westId;
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
  const weekEvents = recentEvents.filter(e => e.week === thisWeek);

  const econItems: DigestItem[] = [];
  const scoutItems: DigestItem[] = [];
  const govItems: DigestItem[] = [];
  const welfareItems: DigestItem[] = [];

  for (const e of weekEvents) {
    const item: DigestItem = {
      id: e.id,
      kind: e.category === "scouting" ? "scouting" : e.category === "economy" || e.category === "sponsor" ? "economy" : e.category === "discipline" ? "generic" : "generic",
      title: e.title,
      detail: e.summary,
      rikishiId: e.rikishiId,
      heyaId: e.heyaId
    };

    if (e.category === "economy" || e.category === "sponsor") econItems.push({ ...item, kind: "economy" });
    else if (e.category === "scouting") scoutItems.push({ ...item, kind: "scouting" });
    else if (e.type.startsWith("GOVERNANCE") || e.type.includes("SCANDAL")) govItems.push({ ...item, kind: "generic" });
    else if (e.type.startsWith("COMPLIANCE") || e.type.startsWith("WELFARE")) welfareItems.push({ ...item, kind: "generic" });
  }

  if (welfareItems.length) sections.push({ id: "welfare", title: "Welfare & Compliance", items: welfareItems });
  if (govItems.length) sections.push({ id: "governance", title: "Governance", items: govItems });
  if (scoutItems.length) sections.push({ id: "scouting", title: "Scouting", items: scoutItems });
  if (econItems.length) sections.push({ id: "economy", title: "Economy", items: econItems });

  const counts = {
    trainingEvents: weekEvents.filter(e=>e.category==="training").length,
    injuries: injuryItems.length,
    recoveries: 0,
    economy: econItems.length,
    scouting: scoutItems.length,
  };

  const headline =
    basho && world.cyclePhase === "active_basho"
      ? `Basho Day ${basho.day ?? (basho as any).currentDay ?? 1}: ${matchupItems.length ? "Key matchups highlighted." : "Tournament in progress."}`
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
