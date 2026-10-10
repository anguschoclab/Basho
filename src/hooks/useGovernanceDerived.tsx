/**
 * useGovernanceDerived.ts
 * =======================
 * Derived view-model for GovernancePage: governance projection, ruling
 * history rows, welfare/merger lists, faction rows, and resolved-ruling ids.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { StatItem, ProgressItem } from "@/components/layout/control-center";
import { SCANDAL_LABELS, formatFinePenalty, getStatusLabel } from "@/presenters/uiDigest";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { projectGovernanceDerived } from "@/presenters/projections/governanceProjections";
import { selectClosedHeyas, selectYokozunaVacancyStreak } from "@/presenters/selectors";
import { getOyakata } from "@/presenters/worldAccess";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Faction } from "@/engine/types/economy";

function buildHistoryRows(history: NonNullable<Heya["governanceHistory"]>) {
  return [...history]
    .reverse()
    .slice(0, 10)
    .map((ruling, i) => ({
      id: ruling.id || String(i),
      label: (
        <div>
          <div className="font-medium">{ruling.type.toUpperCase()}</div>
          {ruling.reason && (
            <div className="text-[10px] text-muted-foreground">{ruling.reason}</div>
          )}
        </div>
      ),
      sub: ruling.date as string | undefined,
      value: ruling.effects?.fineAmount ? formatFinePenalty(ruling.effects.fineAmount) : undefined,
      tone: "destructive" as const,
      trailing: (
        <Badge variant="outline" className="text-[10px]">
          {ruling.severity}
        </Badge>
      ),
    }));
}

function buildFactionRows(factionList: Faction[], heya: Heya, world: WorldState) {
  const maxInfluence = factionList.length > 0 ? factionList[0].influence : 0;
  return factionList.map((fac) => ({
    id: fac.id,
    label: (
      <span className="flex items-center gap-1.5 flex-wrap">
        {fac.name}
        {fac.influence === maxInfluence && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-3.5">
            Chairman
          </Badge>
        )}
        {heya.ichimon === fac.id && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-3.5 border-primary text-primary"
          >
            Yours
          </Badge>
        )}
      </span>
    ),
    sub: `Leader: ${getOyakata(world, fac.oyakataLeaderId ?? "")?.name ?? "Unknown"}`,
    value: fac.influence,
    tone: (heya.ichimon === fac.id ? "gold" : "default") as StatItem["tone"],
  }));
}

export function useGovernanceDerived(world: WorldState | null) {
  const heya = useMemo(() => {
    if (!world || !world.playerHeyaId) return null;
    return getPlayerHeya(world) ?? null;
  }, [world]);

  const closedHeyas = useMemo(
    () => (world ? (world.closedHeyas ? selectClosedHeyas(world) : []) : []),
    [world]
  );
  const yokozunaVacancyStreak = useMemo(
    () => (world ? (world.yokozunaVacancyStreak ?? selectYokozunaVacancyStreak(world)) : 0),
    [world]
  );

  const derived = useMemo(() => {
    if (!world || !heya) return null;

    const gov = projectGovernanceDerived(world, heya);

    const history = heya.governanceHistory ?? [];
    const historyRows = buildHistoryRows(history);

    const welfareRows = gov.criticalHeyas.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.welfareState?.complianceState ?? "compliant"} · ${h.rikishiIds?.length ?? 0} rikishi`,
      value: `Risk ${Math.round(h.welfareState?.welfareRisk ?? 0)}%`,
      tone: "warning" as const,
    }));

    const mergerRows = gov.mergerCandidates.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.rikishiIds?.length ?? 0} rikishi · ${(h.governanceStatus ?? "good_standing").replace("_", " ")}`,
      value: `¥${Math.abs(h.funds / 1_000_000).toFixed(1)}M debt`,
      tone: "destructive" as const,
    }));

    const completedMergerRows = gov.completedMergerEvents.map((e) => ({
      id: e.id,
      label: `${e.data?.heyaname ?? "Unknown"} → ${e.data?.heya ?? "Unknown"}`,
      sub: `Year ${e.year}, Week ${e.week} · ${String(e.data?.reason ?? e.data?.incident ?? "merger")}`,
      tone: "default" as const,
    }));

    const factionRows = buildFactionRows(gov.factionList, heya, world);

    const reputationStats: StatItem[] = [
      { label: "Scandal Index", value: SCANDAL_LABELS[gov.scandalBand], tone: gov.scandalTone },
    ];
    const reputationProgress: ProgressItem[] = [
      { label: "Scandal Score", value: Math.min(gov.scandal, 100), tone: gov.scandalTone },
    ];

    const welfareStats: StatItem[] = [
      { label: "Risk Level", value: gov.welfareLabel, tone: gov.welfareTone },
      { label: "Status", value: gov.compState.toUpperCase(), tone: gov.compTone },
    ];
    const welfareProgress: ProgressItem[] = [
      { label: "Welfare Risk", value: gov.welfareRisk, tone: gov.welfareTone },
    ];

    const councilStats: StatItem[] = [
      {
        label: "Standing",
        value: getStatusLabel(world, gov.status),
        tone: gov.statusTone,
        sub: gov.statusSub,
      },
    ];

    const recordStats: StatItem[] = [{ label: "Decisions on File", value: history.length }];

    return {
      status: gov.status,
      scandal: gov.scandal,
      scandalBand: gov.scandalBand,
      historyRows,
      unresolvedRulings: gov.unresolvedRulings,
      welfareRows,
      mergerRows,
      completedMergerRows,
      factionRows,
      factionList: gov.factionList,
      reputationStats,
      reputationProgress,
      welfareStats,
      welfareProgress,
      councilStats,
      recordStats,
      pendingRulings: gov.pendingRulings,
    };
  }, [world, heya]);

  const resolvedRulingIds = useMemo(() => {
    const ids = new Set<string>();
    const seen = new Set<string>();
    for (const g of world?.governanceLog ?? []) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      if (g.playerSeverity !== undefined) ids.add(g.id);
    }
    return ids;
  }, [world?.governanceLog]);

  return { heya, closedHeyas, yokozunaVacancyStreak, derived, resolvedRulingIds };
}

export type GovernanceHookResult = ReturnType<typeof useGovernanceDerived>;
export type GovernanceDerivedData = NonNullable<GovernanceHookResult["derived"]>;
