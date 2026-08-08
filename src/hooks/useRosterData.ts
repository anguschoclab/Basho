import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { projectRosterEntry, type UIRosterEntry, projectRikishi } from "@/presenters/uiModels";
import { getHealthBadge } from "@/presenters/PerceptionPresenter";
import { toFatigueBand } from "@/engine/descriptorBands";
import { getPlayerHeya } from "@/engine/queries";

export type RosterEntryWithHealth = UIRosterEntry & { healthBadge: string };

export function useRosterData() {
  const { state, updateWorld } = useGame();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const headerAction = useMemo(
    () => ({
      label: "All Rikishi",
      onClick: () => navigate({ to: "/stable/roster" }),
    }),
    [navigate]
  );
  const world = state.world;

  const handleWithdraw = React.useCallback(
    (rikishiId: string) => {
      if (!world) return;

      const rikishi = world.rikishi.get(rikishiId);
      if (rikishi && rikishi.injured) {
        const updatedWorld = {
          ...world,
          rikishi: new Map(world.rikishi).set(rikishiId, {
            ...rikishi,
            isKyujo: true,
            kyujoReason: "injury" as const,
            medicalCertificate: {
              injury: rikishi.injuryStatus?.type || "unknown",
              severity: rikishi.injuryStatus?.severity || "moderate",
              treatmentWeeks: rikishi.injuryWeeksRemaining,
              submittedDate: world.calendar?.currentWeek ?? world.week ?? 0,
            },
          }),
        };
        updateWorld(updatedWorld);
      }
    },
    [world, updateWorld]
  );

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1], id]
    );
  }, []);

  const comparisonPair = useMemo(() => {
    if (selectedIds.length < 2 || !world) return null;
    const coreA = world.rikishi.get(selectedIds[0]);
    const coreB = world.rikishi.get(selectedIds[1]);
    if (!coreA || !coreB) return null;
    return { a: projectRikishi(coreA, world), b: projectRikishi(coreB, world) };
  }, [selectedIds, world]);

  const { roster, injuredCount, avgFatigueValue, avgFatigueBand } = useMemo(() => {
    if (!world?.playerHeyaId)
      return { roster: [], injuredCount: 0, avgFatigueValue: 0, avgFatigueBand: "fresh" as const };
    const heya = getPlayerHeya(world);
    if (!heya)
      return { roster: [], injuredCount: 0, avgFatigueValue: 0, avgFatigueBand: "fresh" as const };

    const entries: RosterEntryWithHealth[] = [];
    let injuries = 0;
    let totalFatigue = 0;

    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (r) {
        const entry = projectRosterEntry(r, world);
        const healthBadge = getHealthBadge(r);
        entries.push({ ...entry, healthBadge });
        if (entry.isInjured) injuries++;
        totalFatigue += entry.fatigue;
      }
    }

    entries.sort((a, b) => b.momentum - a.momentum);

    const avgFatigueValue = entries.length ? Math.round(totalFatigue / entries.length) : 0;
    const avgFatigueBand = toFatigueBand(avgFatigueValue);

    return {
      roster: entries,
      injuredCount: injuries,
      avgFatigueValue,
      avgFatigueBand,
    };
  }, [world]);

  const handleViewAllRikishi = React.useCallback(
    () => navigate({ to: "/stable/roster" }),
    [navigate]
  );

  return {
    world,
    selectedIds,
    showCompare,
    setShowCompare,
    headerAction,
    handleWithdraw,
    toggleSelection,
    comparisonPair,
    roster,
    injuredCount,
    avgFatigueValue,
    avgFatigueBand,
    handleViewAllRikishi,
  };
}
