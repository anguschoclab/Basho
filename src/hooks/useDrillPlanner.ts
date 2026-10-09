/**
 * useDrillPlanner.ts
 *
 * WeeklyDrillPlanner state — multi-select, fill-week, batch assign,
 * and archetype-based autoset.
 */

import { useState } from "react";
import type { DrillType } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types";

export const DAYS = [
  { id: 1, label: "Mon", short: "M" },
  { id: 2, label: "Tue", short: "T" },
  { id: 3, label: "Wed", short: "W" },
  { id: 4, label: "Thu", short: "T" },
  { id: 5, label: "Fri", short: "F" },
  { id: 6, label: "Sat", short: "S" },
];

/** Full-week schedule filled with a single drill. */
function weekSchedule(drill: DrillType): Record<number, DrillType> {
  const schedule: Record<number, DrillType> = {};
  DAYS.forEach((d) => {
    schedule[d.id] = drill;
  });
  return schedule;
}

/** Archetype-driven autoset: primary drills M/W/F, asageiko T/Th, shindo Sat. */
export function autosetSchedule(rikishi: Rikishi): Record<number, DrillType> {
  const arch = rikishi.combatProfile?.archetype ?? "hybrid";
  const schedule: Record<number, DrillType> = {};
  DAYS.forEach((d) => {
    if (d.id === 6) {
      schedule[d.id] = "shindo";
    } else if ([1, 3, 5].includes(d.id)) {
      if (arch === "oshi" || arch === "tsuppari") schedule[d.id] = "teppo";
      else if (arch === "yotsu" || arch === "giant") schedule[d.id] = "butsukari";
      else schedule[d.id] = "moushi-ai";
    } else {
      schedule[d.id] = "asageiko";
    }
  });
  return schedule;
}

export function useDrillPlanner({
  rikishiList,
  onBulkUpdate,
  onMultiBulkUpdate,
}: {
  rikishiList: Rikishi[];
  onBulkUpdate: (rikishiId: string, daySchedule: Record<number, DrillType>) => void;
  onMultiBulkUpdate: (rikishiIds: string[], daySchedule: Record<number, DrillType>) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = rikishiList.length > 0 && selectedIds.size === rikishiList.length;

  const handleFillWeek = (rikishiId: string, drill: DrillType) => {
    onBulkUpdate(rikishiId, weekSchedule(drill));
  };

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(rikishiList.map((r) => r.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchAssign = (drillType: DrillType) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onMultiBulkUpdate(ids, weekSchedule(drillType));
  };

  const handleAutoSetPlan = () => {
    // Logic: Assign drills based on archetype
    rikishiList.forEach((rikishi) => {
      // If we have selected IDs, only autoset those, otherwise autoset all
      if (selectedIds.size > 0 && !selectedIds.has(rikishi.id)) return;
      onBulkUpdate(rikishi.id, autosetSchedule(rikishi));
    });
  };

  return {
    selectedIds,
    setSelectedIds,
    isAllSelected,
    toggleSelectAll,
    toggleSelect,
    handleFillWeek,
    handleBatchAssign,
    handleAutoSetPlan,
  };
}
