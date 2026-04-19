import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, Coins, Dumbbell, Users } from "lucide-react";
import { ProgressionTracker } from "@/components/game/ProgressionTracker";
import {
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
} from "@/presenters/projections/promotionProjections";
import { projectDashboardUIDigest } from "@/presenters/uiDigest";
import { projectFinanceSummary } from "@/presenters/projections/financeProjections";
import { projectTrainingSummary } from "@/presenters/projections/trainingProjections";

import { OnboardingTourDialog } from "@/components/onboarding/OnboardingTourDialog";
import { CrisisModal } from "@/components/game/CrisisModal";
import { SuccessionModal } from "@/components/stable/SuccessionModal";
import { DynastyService } from "@/engine/systems/legacy/DynastyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

import { PageHeader, StatCard, ListCard, ProgressRow } from "@/components/layout/control-center";
import { FinancesWidget } from "@/components/dashboard/FinancesWidget";
import { BashoWidget } from "@/components/dashboard/BashoWidget";
import { TrendsWidget } from "@/components/dashboard/TrendsWidget";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { formatYen } from "@/utils/engineUtils";

/** Control Center — main dashboard. */
export default function Dashboard() {
  const { state, updateWorld, hasAutosave, loadFromAutosave } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const isLoaded = !!world;
  const [deliberationCandidateId, setDeliberationCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (state.phase === "basho_recap" || state.phase === "basho_results")
      navigate({ to: "/recap" });
  }, [state.phase, navigate]);

  useEffect(() => {
    if (!isLoaded && hasAutosave()) {
      loadFromAutosave();
    } else if (!isLoaded && !hasAutosave()) {
      navigate({ to: "/main-menu", replace: true });
    }
  }, [isLoaded, hasAutosave, loadFromAutosave, navigate]);

  useEffect(() => {
    if (!world?.events?.log) return;
    const evt = world.events.log
      .slice()
      .reverse()
      .find((e) => (e as { type?: string }).type === "PROMOTION_DELIBERATION");
    if (evt && !deliberationCandidateId) {
      setDeliberationCandidateId(
        (evt as { context?: { rikishiId?: string } }).context?.rikishiId ?? null
      );
    }
  }, [world?.events?.log, deliberationCandidateId]);

  const playerHeya = useMemo(
    () => (world?.playerHeyaId ? (world.heyas.get(world.playerHeyaId) ?? null) : null),
    [world]
  );

  const digest = useMemo(() => (world ? projectDashboardUIDigest(world) : null), [world]);

  const finance = useMemo(() => (world ? projectFinanceSummary(world) : null), [world]);

  const training = useMemo(
    () => (world && playerHeya ? projectTrainingSummary(world, playerHeya.id) : null),
    [world, playerHeya]
  );

  const alerts = useMemo(() => {
    const out: { text: string; link: string }[] = [];
    if (finance?.runwayBand === "critical" || finance?.runwayBand === "desperate")
      out.push({ text: "Funds critical — insolvency risk", link: "/office/finances" });
    if (training && training.injuryRiskHighCount > 2)
      out.push({
        text: `${training.injuryRiskHighCount} wrestlers at high injury risk`,
        link: "/stable/medical",
      });
    return out;
  }, [finance, training]);

  const rosterData = useMemo(() => {
    let sekitoriCount = 0;
    const rows: {
      id: string;
      label: string;
      value: string;
      sub?: string;
      tone?: "default" | "warning" | "destructive";
      onClick?: () => void;
    }[] = [];

    if (!world || !playerHeya) return { rows: [], sekitoriCount: 0 };

    const ids = playerHeya.rikishiIds ?? [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const r = world.rikishi.get(id);
      if (!r) continue;

      const rank = r.rank ?? "";
      if (
        rank === "juryo" ||
        rank === "yokozuna" ||
        rank === "ozeki" ||
        rank === "sekiwake" ||
        rank === "komusubi" ||
        rank === "maegashira"
      ) {
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
          onClick: () => navigate({ to: "/stable/roster" }),
        });
      }
    }

    return { rows, sekitoriCount };
  }, [world, playerHeya, navigate]);

  const phase = world?.cyclePhase ?? "interim";
  const phaseLabel =
    phase === "active_basho"
      ? "Tournament Active"
      : phase === "pre_basho"
        ? "Pre-Basho"
        : phase === "post_basho"
          ? "Post-Basho"
          : "Off-Season";

  if (!isLoaded || !world) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">
        Institutional interface initializing…
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-10 animate-fade-in">
        {/* ── PAGE HEADER ── */}
        <PageHeader
          eyebrow="── CONTROL CENTER ──"
          title={playerHeya ? playerHeya.name : "Your Stable"}
          lede={`Year ${world.year} · Week ${world.week} · ${phaseLabel}`}
          actions={
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase text-gold border-gold/30"
            >
              司令塔
            </Badge>
          }
        />

        {/* ── CRITICAL ALERTS ── */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <button
                key={i}
                onClick={() => navigate({ to: a.link as Parameters<typeof navigate>[0]["to"] })}
                className="flex items-center gap-3 px-4 py-2.5 rounded border border-destructive/30 bg-destructive/8 hover:bg-destructive/15 transition-colors text-left group"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-xs font-bold text-destructive flex-1">{a.text}</span>
                <ChevronRight className="h-3.5 w-3.5 text-destructive/50 group-hover:text-destructive transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* ── PROMOTION ARCS ── */}
        <ProgressionTracker
          ozekiRuns={getOzekiRunCandidates(world)}
          yokozunaCandidates={getYokozunaCandidates(world)}
          kadobanDrama={getKadobanDrama(world)}
          playerHeyaId={world.playerHeyaId ?? ""}
        />

        {/* ── THREE-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── COL 1: STABLE OVERVIEW ── */}
          <div className="space-y-4">
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
                  value: String(rosterData.sekitoriCount),
                  tone: "gold",
                },
                {
                  label: "Fatigue",
                  value: `${training?.avgFatigue ?? 0}%`,
                  tone: (training?.avgFatigue ?? 0) > 70 ? "warning" : "success",
                },
              ]}
              progress={[
                {
                  label: "Avg Fatigue",
                  value: training?.avgFatigue ?? 0,
                  tone: (training?.avgFatigue ?? 0) > 70 ? "destructive" : "success",
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

          {/* ── COL 2: TOURNAMENT + CALENDAR ── */}
          <div className="space-y-4">
            <CalendarWidget />
            <BashoWidget />
          </div>

          {/* ── COL 3: TRAINING + TRENDS ── */}
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
                <p className="stat-label text-gold tracking-[0.2em] text-[10px]">
                  ── FATIGUE LEVELS ──
                </p>
                {training.rosterStatuses.slice(0, 6).map((rs) => (
                  <ProgressRow
                    key={rs.id}
                    name={rs.shikona}
                    subtitle={rs.fatigueLabel}
                    value={rs.fatigue}
                    tone={rs.fatigue > 70 ? "destructive" : rs.fatigue > 40 ? "warning" : "success"}
                    showValue
                  />
                ))}
              </div>
            )}

            <TrendsWidget />
          </div>
        </div>

        {/* ── FULL-WIDTH: FINANCES CHART ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinancesWidget />
          <div className="paper rounded-lg overflow-hidden p-4 space-y-3">
            <p className="stat-label text-gold tracking-[0.2em] text-[10px]">── WEEKLY DIGEST ──</p>
            {digest?.recentEvents?.slice(0, 6).map((evt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                  {String(evt.week ?? "").padStart(2, "0")}
                </span>
                <span className="text-foreground/80 leading-snug">
                  {evt.summary ?? evt.title ?? String(evt.type)}
                </span>
              </div>
            )) ?? <p className="text-xs text-muted-foreground italic">No events this week.</p>}
          </div>
        </div>
      </div>

      <OnboardingTourDialog />

      {(() => {
        const ph = world.heyas.get(state.playerHeyaId ?? "");
        const ok = world.oyakata.get(ph?.oyakataId ?? "");
        if (ok?.successionReadiness !== "mandatory") return null;
        return (
          <SuccessionModal
            isOpen={true}
            onClose={() => {}}
            world={world}
            heyaId={state.playerHeyaId ?? ""}
            onSelect={(successorId) => {
              const impact = DynastyService.triggerSuccession(
                world,
                state.playerHeyaId ?? "",
                successorId
              );
              updateWorld(resolveImpacts(world, [impact]));
            }}
          />
        );
      })()}

      <CrisisModal />
    </AppLayout>
  );
}
