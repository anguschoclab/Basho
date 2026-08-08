/**
 * perceptionComponents.tsx
 *
 * Helper components for perception overview.
 */

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StableName, RikishiName } from "@/components/ClickableName";
import { Building2, Eye, Shield, Heart, TrendingUp, Flame, Users, Swords } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { projectH2HBetweenHeyas } from "@/presenters/uiDigest";
import type { PerceptionSnapshot } from "@/engine/perception";
import type { H2HMatchupData } from "@/presenters/projections/boutProjections";
import {
  STATURE_COLOR,
  ROSTER_COLOR,
  MORALE_COLOR,
  WELFARE_COLOR,
  HEALTH_COLOR,
  MOMENTUM_COLOR,
} from "../../constants/ui/perception";

export const RikishiSelectorItem = React.memo(
  ({
    r,
    isSelected,
    onSelect,
  }: {
    r: { rikishiId: string; shikona: string; rank: string };
    isSelected: boolean;
    onSelect: (id: string) => void;
  }) => {
    return (
      <Button
        variant="ghost"
        className={`w-full justify-start h-auto text-xs px-2 py-1 rounded transition-colors ${
          isSelected
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "hover:bg-secondary/50 text-foreground"
        }`}
        onClick={() => onSelect(r.rikishiId)}
      >
        {r.shikona} <span className="text-muted-foreground capitalize">({r.rank})</span>
      </Button>
    );
  }
);

export function RikishiSelectorList({
  perceptions,
  selectedId,
  onSelect,
}: {
  perceptions: Array<{ rikishiId: string; shikona: string; rank: string }>;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollArea className="max-h-28 border border-border rounded-md">
      <div className="p-1 space-y-0.5">
        {perceptions.map((r) => (
          <RikishiSelectorItem
            key={r.rikishiId}
            r={r}
            isSelected={selectedId === r.rikishiId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

const COMPARE_ROWS: Array<{
  label: string;
  icon: React.ElementType;
  get: (s: PerceptionSnapshot) => string;
  colorMap?: Record<string, string>;
}> = [
  { label: "Stature", icon: Building2, get: (s) => s.statureBand, colorMap: STATURE_COLOR },
  {
    label: "Roster",
    icon: Users,
    get: (s) => `${s.rosterStrengthBand} (${s.rosterSize})`,
    colorMap: ROSTER_COLOR,
  },
  { label: "Morale", icon: Heart, get: (s) => s.moraleBand, colorMap: MORALE_COLOR },
  { label: "Welfare", icon: Shield, get: (s) => s.welfareRiskBand, colorMap: WELFARE_COLOR },
  { label: "Prestige", icon: TrendingUp, get: (s) => s.prestigeBand },
  { label: "Finances", icon: Building2, get: (s) => s.runwayBand },
  { label: "Media Heat", icon: Flame, get: (s) => s.stableMediaHeatBand },
  { label: "Rivalry", icon: Flame, get: (s) => s.rivalryPressureBand },
  { label: "Style Bias", icon: Eye, get: (s) => String(s.styleBias) },
  { label: "Compliance", icon: Shield, get: (s) => s.complianceState },
];

export const CompareRowItem = React.memo(
  ({
    row,
    snapA,
    snapB,
  }: {
    row: (typeof COMPARE_ROWS)[0];
    snapA: PerceptionSnapshot;
    snapB: PerceptionSnapshot;
  }) => {
    const valA = row.get(snapA);
    const valB = row.get(snapB);
    const bandA = valA.split(" ")[0];
    const bandB = valB.split(" ")[0];
    const colorA = row.colorMap?.[bandA] ?? "";
    const colorB = row.colorMap?.[bandB] ?? "";
    return (
      <div className="grid grid-cols-[1fr_24px_80px_24px_1fr] gap-1 text-xs py-1 items-center">
        <div className={`text-right capitalize font-medium ${colorA}`}>{valA}</div>
        <div className="flex justify-center">
          <row.icon className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="text-center text-muted-foreground">{row.label}</div>
        <div />
        <div className={`capitalize font-medium ${colorB}`}>{valB}</div>
      </div>
    );
  }
);

export function StableMetricGrid({
  snapA,
  snapB,
}: {
  snapA: PerceptionSnapshot;
  snapB: PerceptionSnapshot;
}) {
  return (
    <>
      <div className="grid grid-cols-[1fr_24px_80px_24px_1fr] gap-1 text-xs font-medium mb-2 pb-1 border-b border-border">
        <div className="text-right truncate text-primary">{snapA.heyaName}</div>
        <div />
        <div className="text-center text-muted-foreground">Metric</div>
        <div />
        <div className="truncate text-primary">{snapB.heyaName}</div>
      </div>
      {COMPARE_ROWS.map((row) => (
        <CompareRowItem key={row.label} row={row} snapA={snapA} snapB={snapB} />
      ))}
    </>
  );
}

export function RikishiComparisonGrid({
  snapA,
  snapB,
}: {
  snapA: PerceptionSnapshot;
  snapB: PerceptionSnapshot;
}) {
  const [selectedA, setSelectedA] = useState<string | null>(
    snapA.rikishiPerceptions[0]?.rikishiId ?? null
  );
  const [selectedB, setSelectedB] = useState<string | null>(
    snapB.rikishiPerceptions[0]?.rikishiId ?? null
  );

  const perceptionAById = useMemo(
    () => new Map(snapA.rikishiPerceptions.map((r) => [r.rikishiId, r])),
    [snapA.rikishiPerceptions]
  );
  const perceptionBById = useMemo(
    () => new Map(snapB.rikishiPerceptions.map((r) => [r.rikishiId, r])),
    [snapB.rikishiPerceptions]
  );

  const rA = selectedA ? perceptionAById.get(selectedA) : undefined;
  const rB = selectedB ? perceptionBById.get(selectedB) : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">{snapA.heyaName}</label>
          <RikishiSelectorList
            perceptions={snapA.rikishiPerceptions}
            selectedId={selectedA ?? undefined}
            onSelect={setSelectedA}
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">{snapB.heyaName}</label>
          <RikishiSelectorList
            perceptions={snapB.rikishiPerceptions}
            selectedId={selectedB ?? undefined}
            onSelect={setSelectedB}
          />
        </div>
      </div>

      {rA && rB ? (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_24px_64px_24px_1fr] gap-1 text-xs font-medium pb-1 border-b border-border">
            <div className="text-right truncate text-primary">{rA.shikona}</div>
            <div />
            <div className="text-center text-muted-foreground">Metric</div>
            <div />
            <div className="truncate text-primary">{rB.shikona}</div>
          </div>
          <RikishiRow label="Rank" valA={rA.rank} valB={rB.rank} />
          <RikishiRow label="Style" valA={rA.style} valB={rB.style} />
          <RikishiRow
            label="Health"
            valA={rA.healthBand}
            valB={rB.healthBand}
            colorMapA={HEALTH_COLOR}
            colorMapB={HEALTH_COLOR}
          />
          <RikishiRow
            label="Momentum"
            valA={rA.momentum}
            valB={rB.momentum}
            colorMapA={MOMENTUM_COLOR}
            colorMapB={MOMENTUM_COLOR}
          />
          <RikishiRow label="Media" valA={rA.mediaHeatBand} valB={rB.mediaHeatBand} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          Select one rikishi from each stable.
        </p>
      )}
    </div>
  );
}

function RikishiRow({
  label,
  valA,
  valB,
  colorMapA,
  colorMapB,
}: {
  label: string;
  valA: string;
  valB: string;
  colorMapA?: Record<string, string>;
  colorMapB?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-[1fr_24px_64px_24px_1fr] gap-1 text-xs py-0.5 items-center">
      <div className={`text-right capitalize font-medium ${colorMapA?.[valA] ?? ""}`}>{valA}</div>
      <div />
      <div className="text-center text-muted-foreground">{label}</div>
      <div />
      <div className={`capitalize font-medium ${colorMapB?.[valB] ?? ""}`}>{valB}</div>
    </div>
  );
}

export function H2HPanel({ heyaAId, heyaBId }: { heyaAId: string; heyaBId: string }) {
  const { state } = useGame();
  const world = state.world;

  const h2hData = useMemo(() => {
    if (!world) return null;
    return projectH2HBetweenHeyas(world, heyaAId, heyaBId);
  }, [world, heyaAId, heyaBId]);

  if (!h2hData) return <p className="text-xs text-muted-foreground">No data available.</p>;

  if (h2hData.totalBouts === 0) {
    return (
      <div className="text-center py-6">
        <Swords className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">
          No bouts recorded between these stables yet.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          H2H records build up as basho are played.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Aggregate record */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="text-right">
          <div className="text-lg font-display font-bold text-primary">{h2hData.winsA}</div>
          <div className="text-[10px] text-muted-foreground">{h2hData.heyaAName}</div>
        </div>
        <div className="text-muted-foreground text-xs font-medium">—</div>
        <div className="text-left">
          <div className="text-lg font-display font-bold text-primary">{h2hData.winsB}</div>
          <div className="text-[10px] text-muted-foreground">{h2hData.heyaBName}</div>
        </div>
      </div>
      <div className="text-center text-[10px] text-muted-foreground">
        {h2hData.totalBouts} bout{h2hData.totalBouts !== 1 ? "s" : ""} across{" "}
        {h2hData.matchups.length} matchup{h2hData.matchups.length !== 1 ? "s" : ""}
      </div>

      {/* Win share bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <div
          className="bg-primary transition-all"
          style={{ width: `${(h2hData.winsA / h2hData.totalBouts) * 100}%` }}
        />
        <div
          className="bg-destructive transition-all"
          style={{ width: `${(h2hData.winsB / h2hData.totalBouts) * 100}%` }}
        />
      </div>

      {/* Individual matchups */}
      <ScrollArea className="max-h-48">
        <div className="space-y-1.5 pr-2">
          {h2hData.matchups.map((m: H2HMatchupData, i: number) => (
            <MatchupRow key={i} m={m} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export const MatchupRow = React.memo(({ m }: { m: H2HMatchupData }) => {
  return (
    <div className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
      <div className="flex-1 text-right truncate">
        <RikishiName id={m.rikishiAId} name={m.rikishiAName} className="text-xs font-medium" />
      </div>
      <div className="mx-3 font-mono text-muted-foreground whitespace-nowrap">
        <span className={m.aWins > m.bWins ? "text-primary font-bold" : ""}>{m.aWins}</span>
        {" - "}
        <span className={m.bWins > m.aWins ? "text-primary font-bold" : ""}>{m.bWins}</span>
      </div>
      <div className="flex-1 truncate">
        <RikishiName id={m.rikishiBId} name={m.rikishiBName} className="text-xs font-medium" />
      </div>
      {m.lastKimarite && (
        <Badge variant="outline" className="text-[9px] ml-2 shrink-0">
          {m.lastKimarite}
        </Badge>
      )}
    </div>
  );
});

export function PerceptionChip({
  icon: Icon,
  label,
  value,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  count?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium capitalize ${color ?? "text-foreground"}`}>
        {value}
        {count != null && <span className="text-muted-foreground ml-0.5">({count})</span>}
      </span>
    </div>
  );
}

export const StablePerceptionCard = React.memo(
  ({
    snap,
    comparing,
    isSelected,
    onToggleCompare,
    onNavigate,
  }: {
    snap: PerceptionSnapshot & { isPlayer?: boolean };
    comparing: boolean;
    isSelected: boolean;
    onToggleCompare: (id: string) => void;
    onNavigate: (id: string) => void;
  }) => {
    return (
      <Card
        className={`paper cursor-pointer hover:border-primary/50 transition-all ${snap.isPlayer ? "border-primary/30 bg-primary/5" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
        onClick={(e) => {
          if (comparing) {
            e.preventDefault();
            onToggleCompare(snap.heyaId);
          } else {
            onNavigate(snap.heyaId);
          }
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {comparing ? (
                  <span className="font-medium text-sm">{snap.heyaName}</span>
                ) : (
                  <StableName
                    id={snap.heyaId}
                    name={snap.heyaName}
                    className="font-medium text-sm"
                  />
                )}
                {snap.isPlayer && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/10 text-primary border-primary/30"
                  >
                    Your Stable
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize ${STATURE_COLOR[snap.statureBand] ?? ""}`}
                >
                  {snap.statureBand}
                </Badge>
                {comparing && isSelected && (
                  <Badge variant="default" className="text-[10px]">
                    Selected
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-2">
                <PerceptionChip
                  icon={Users}
                  label="Roster"
                  value={snap.rosterStrengthBand}
                  count={snap.rosterSize}
                  color={ROSTER_COLOR[snap.rosterStrengthBand]}
                />
                <PerceptionChip
                  icon={Heart}
                  label="Morale"
                  value={snap.moraleBand}
                  color={MORALE_COLOR[snap.moraleBand]}
                />
                <PerceptionChip
                  icon={Shield}
                  label="Welfare"
                  value={snap.welfareRiskBand}
                  color={WELFARE_COLOR[snap.welfareRiskBand]}
                />
                <PerceptionChip
                  icon={Flame}
                  label="Media"
                  value={snap.stableMediaHeatBand}
                  color={
                    snap.stableMediaHeatBand === "blazing"
                      ? "text-destructive"
                      : snap.stableMediaHeatBand === "hot"
                        ? "text-warning"
                        : "text-muted-foreground"
                  }
                />
              </div>

              <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                <span>
                  Prestige:{" "}
                  <strong className="text-foreground capitalize">{snap.prestigeBand}</strong>
                </span>
                <span>
                  Finances:{" "}
                  <strong className="text-foreground capitalize">{snap.runwayBand}</strong>
                </span>
                <span>
                  Rivalry:{" "}
                  <strong className="text-foreground capitalize">{snap.rivalryPressureBand}</strong>
                </span>
                <span>
                  Style: <strong className="text-foreground capitalize">{snap.styleBias}</strong>
                </span>
                {snap.complianceState !== "compliant" && (
                  <span className="text-warning">⚠ {snap.complianceState}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
