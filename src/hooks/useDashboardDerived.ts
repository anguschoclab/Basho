/**
 * useDashboardDerived.ts
 *
 * Derived data for the Dashboard control center — projections, action
 * queue, roster rows, and exhibition/sanction projections.
 */

import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { WorldState } from "@/presenters/uiDigest";

import { projectDashboardUIDigest } from "@/presenters/uiDigest";
import { projectFinanceSummary } from "@/presenters/projections/financeProjections";
import { isSekitoriRank } from "@/constants/engine/rankDisplay";
import { projectTrainingSummary } from "@/presenters/projections/trainingProjections";
import { buildActionQueue } from "@/presenters/projections/actionQueue";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { getRikishi } from "@/presenters/worldAccess";
import { projectExhibitions, type ExhibitionProjection } from "@/presenters/exhibitionProjections";
import { projectGomenfuda } from "@/presenters/projections/governanceProjections";
import { projectAdvisorRecommendations } from "@/presenters/projections/advisorProjections";

export interface RosterRow {
  id: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning" | "destructive";
  onClick?: () => void;
}

export interface DashboardDerived {
  playerHeya: ReturnType<typeof getPlayerHeya> | null;
  digest: ReturnType<typeof projectDashboardUIDigest> | null;
  finance: ReturnType<typeof projectFinanceSummary> | null;
  training: ReturnType<typeof projectTrainingSummary> | null;
  queue: ReturnType<typeof buildActionQueue>;
  advisorRecs: ReturnType<typeof projectAdvisorRecommendations>;
  rosterData: { rows: RosterRow[]; sekitoriCount: number };
  exhibitionProjection: ExhibitionProjection;
  gomenfudaProjection: ReturnType<typeof projectGomenfuda>;
  phase: string;
  phaseLabel: string;
}

function buildRosterRows(
  world: WorldState,
  playerHeya: NonNullable<ReturnType<typeof getPlayerHeya>>,
  onNavigateRoster: () => void
): { rows: RosterRow[]; sekitoriCount: number } {
  let sekitoriCount = 0;
  const rows: RosterRow[] = [];

  const ids = playerHeya.rikishiIds ?? [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const r = getRikishi(world, id);
    if (!r) continue;

    const rank = r.rank ?? "";
    if (isSekitoriRank(rank)) {
      sekitoriCount++;
    }

    if (rows.length < 8) {
      const rankLabel = r.rank
        ? `${r.rank.charAt(0).toUpperCase() + r.rank.slice(1)}${r.rankNumber ? ` ${r.rankNumber}` : ""}${r.side === "east" ? "E" : "W"}`
        : "—";
      rows.push({
        id,
        label: r.shikona ?? r.name ?? id,
        value: rankLabel,
        sub: r.injured ? "injured" : r.isKyujo ? "kyujo" : undefined,
        tone: r.injured
          ? ("destructive" as const)
          : r.isKyujo
            ? ("warning" as const)
            : ("default" as const),
        onClick: onNavigateRoster,
      });
    }
  }

  return { rows, sekitoriCount };
}

export function useDashboardDerived(world: WorldState | undefined): DashboardDerived {
  const navigate = useNavigate();

  const playerHeya = useMemo(
    () => (world?.playerHeyaId ? (getPlayerHeya(world) ?? null) : null),
    [world]
  );

  const digest = useMemo(() => (world ? projectDashboardUIDigest(world) : null), [world]);

  const finance = useMemo(() => (world ? projectFinanceSummary(world) : null), [world]);

  const training = useMemo(
    () => (world && playerHeya ? projectTrainingSummary(world, playerHeya.id) : null),
    [world, playerHeya]
  );

  const queue = useMemo(() => {
    if (!world) return [];
    return buildActionQueue(world, playerHeya, training, finance);
  }, [world, playerHeya, training, finance]);

  const advisorRecs = useMemo(
    () => (world && playerHeya ? projectAdvisorRecommendations(world, playerHeya.id) : []),
    [world, playerHeya]
  );

  const rosterData = useMemo(() => {
    if (!world || !playerHeya) return { rows: [], sekitoriCount: 0 };
    return buildRosterRows(world, playerHeya, () => navigate({ to: "/stable/roster" }));
  }, [world, playerHeya, navigate]);

  const exhibitionProjection = useMemo(() => {
    if (!world || !playerHeya) return { invitations: [], hasInvitations: false };
    return projectExhibitions(world, playerHeya.id);
  }, [world, playerHeya]);

  const gomenfudaProjection = useMemo(() => {
    if (!world || !playerHeya)
      return {
        count: 0,
        threshold: 3,
        hasSanctionWarning: false,
        sanctionRiskPercent: 0,
        recentEvents: [],
      };
    return projectGomenfuda(world, playerHeya.id);
  }, [world, playerHeya]);

  const phase = world?.cyclePhase ?? "interim";
  const phaseLabel =
    phase === "active_basho"
      ? "Tournament Active"
      : phase === "pre_basho"
        ? "Pre-Basho"
        : phase === "post_basho"
          ? "Post-Basho"
          : "Off-Season";

  return {
    playerHeya,
    digest,
    finance,
    training,
    queue,
    advisorRecs,
    rosterData,
    exhibitionProjection,
    gomenfudaProjection,
    phase,
    phaseLabel,
  };
}
