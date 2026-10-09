/**
 * DashboardColumns.tsx
 *
 * The three-column body of the Dashboard control center:
 * stable overview, tournament/calendar, and training/trends.
 */

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Coins, Dumbbell, Users } from "lucide-react";
import type { WorldState } from "@/presenters/uiDigest";
import { StatCard, ListCard, ProgressRow } from "@/components/layout/control-center";
import { InstitutionWidget, TrendsWidget, CalendarWidget, BashoWidget } from "./index";
import { NakabiHighlightCard } from "@/components/basho/NakabiHighlightCard";
import { projectNakabi } from "@/presenters/nakabiProjections";
import { formatYen } from "@/utils/engineUtils";
import { FATIGUE_LABELS } from "@/constants/ui/labels";
import type { DashboardDerived } from "@/hooks/useDashboardDerived";

type Derived = Pick<
  DashboardDerived,
  "playerHeya" | "digest" | "finance" | "training" | "rosterData"
>;

export function DashboardStableColumn({ derived }: { derived: Derived }) {
  const navigate = useNavigate();
  const { playerHeya, digest, finance, training, rosterData } = derived;
  return (
    <div className="space-y-4">
      <InstitutionWidget />
      <StatCard
        eyebrow="── MY STABLE ──"
        title="Roster Status"
        icon={Users}
        stats={[
          { label: "Active", value: String(playerHeya?.rikishiIds?.length ?? 0) },
          {
            label: "Injured",
            value: String(training?.injuredCount ?? 0),
            tone: (training?.injuredCount ?? 0) > 0 ? "destructive" : "default",
          },
          {
            label: "Sekitori",
            value: String(digest?.stats.sekitoriCount ?? 0),
            tone: "gold",
          },
          {
            label: "Fatigue",
            value: FATIGUE_LABELS[training?.avgFatigueBand ?? "fresh"],
            tone: (training?.avgFatigue ?? 0) > 70 ? "warning" : "success",
          },
        ]}
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-bold uppercase"
            onClick={() => navigate({ to: "/stable/roster" })}
          >
            Roster →
          </Button>
        }
      />

      <ListCard
        eyebrow="── TOP WRESTLERS ──"
        title="Active Roster"
        rows={rosterData.rows}
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-bold uppercase"
            onClick={() => navigate({ to: "/stable/roster" })}
          >
            Full Roster →
          </Button>
        }
      />

      <StatCard
        eyebrow="── FINANCES ──"
        title="Treasury"
        icon={Coins}
        stats={[
          {
            label: "Funds",
            value: formatYen(playerHeya?.funds ?? 0),
            tone:
              finance?.runwayBand === "desperate" || finance?.runwayBand === "critical"
                ? "destructive"
                : "gold",
          },
          {
            label: "Weekly Rev",
            value: formatYen(finance?.weeklyRevenue ?? 0),
            tone: "success",
          },
          {
            label: "Weekly Burn",
            value: formatYen(finance?.weeklyExpenses ?? 0),
            tone: "warning",
          },
          {
            label: "Runway",
            value: finance ? `${Math.round(finance.runwayMonths)}mo` : "—",
            tone:
              finance?.runwayBand === "secure"
                ? "success"
                : finance?.runwayBand === "comfortable"
                  ? "default"
                  : "destructive",
          },
        ]}
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-bold uppercase"
            onClick={() => navigate({ to: "/office/finances" })}
          >
            Finances →
          </Button>
        }
      />
    </div>
  );
}

export function DashboardBashoColumn({ world }: { world: WorldState }) {
  const nakabiProjection = projectNakabi(world);
  return (
    <div className="space-y-4">
      <CalendarWidget />
      <BashoWidget />
      {nakabiProjection.isNakabiDay && nakabiProjection.summary && (
        <NakabiHighlightCard projection={nakabiProjection} />
      )}
    </div>
  );
}

export function DashboardTrainingColumn({
  training,
}: {
  training: DashboardDerived["training"];
}) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <StatCard
        eyebrow="── TRAINING ──"
        title="Weekly Regime"
        icon={Dumbbell}
        stats={[
          {
            label: "Intensity",
            value: training
              ? String(training.intensity).charAt(0).toUpperCase() +
                String(training.intensity).slice(1)
              : "—",
          },
          {
            label: "Focus",
            value: training
              ? String(training.focus).charAt(0).toUpperCase() +
                String(training.focus).slice(1)
              : "—",
          },
          {
            label: "High Risk",
            value: String(training?.injuryRiskHighCount ?? 0),
            tone: (training?.injuryRiskHighCount ?? 0) > 0 ? "destructive" : "success",
          },
          {
            label: "Recovery",
            value: training
              ? String(training.recovery).charAt(0).toUpperCase() +
                String(training.recovery).slice(1)
              : "—",
          },
        ]}
        actions={
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] font-bold uppercase"
            onClick={() => navigate({ to: "/stable/training" })}
          >
            Training →
          </Button>
        }
      />

      {training && training.rosterStatuses.length > 0 && (
        <div className="paper rounded-lg p-4 space-y-2">
          <p className="stat-label text-gold tracking-[0.15em] text-[10px]">
            ── FATIGUE LEVELS ──
          </p>
          {training.rosterStatuses.slice(0, 6).map((rs) => (
            <ProgressRow
              key={rs.id}
              name={rs.shikona}
              subtitle={rs.fatigueLabel}
              value={rs.fatigue}
              tone={rs.fatigue > 70 ? "destructive" : rs.fatigue > 40 ? "warning" : "success"}
              showValue={false}
            />
          ))}
        </div>
      )}

      <TrendsWidget />
    </div>
  );
}
