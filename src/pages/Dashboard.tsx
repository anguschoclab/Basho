import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  RotateCcw,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Activity,
  TrendingUp,
} from "lucide-react";
import { ProgressionTracker } from "@/components/game/ProgressionTracker";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { StableName } from "@/components/ClickableName";
import {
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
} from "@/presenters/projections/promotionProjections";

import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { BanzukeWidget } from "@/components/dashboard/BanzukeWidget";
import { StableWidget } from "@/components/dashboard/StableWidget";
import { RosterWidget } from "@/components/dashboard/RosterWidget";
import { FinancesWidget } from "@/components/dashboard/FinancesWidget";
import { BashoWidget } from "@/components/dashboard/BashoWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { RivalsWidget } from "@/components/dashboard/RivalsWidget";
import { ScoutingWidget } from "@/components/dashboard/ScoutingWidget";
import { TrainingWidget } from "@/components/dashboard/TrainingWidget";
import { DigestWidget } from "@/components/dashboard/DigestWidget";
import { TrendsWidget } from "@/components/dashboard/TrendsWidget";
import { InstitutionWidget } from "@/components/dashboard/InstitutionWidget";
import { DraggableWidget } from "@/components/dashboard/DraggableWidget";
import { useDashboardLayout, type WidgetDef } from "@/hooks/useDashboardLayout";
import { projectDashboardUIDigest } from "@/presenters/uiDigest";
import { OnboardingTourDialog } from "@/components/onboarding/OnboardingTourDialog";
import { YokozunaDeliberation } from "@/components/game/YokozunaDeliberation";

const WIDGET_REGISTRY: WidgetDef[] = [
  { id: "calendar", order: 0, span: 4, component: CalendarWidget, label: "Calendar" },
  { id: "stable", order: 1, span: 4, component: StableWidget, label: "Stable" },
  { id: "basho", order: 2, span: 4, component: BashoWidget, label: "Basho" },
  { id: "training", order: 3, span: 6, component: TrainingWidget, label: "Training" },
  { id: "finances", order: 4, span: 6, component: FinancesWidget, label: "Finances" },
  { id: "digest", order: 5, span: 8, component: DigestWidget, label: "Weekly Digest" },
  { id: "trends", order: 6, span: 4, component: TrendsWidget, label: "JSA Trends" },
  { id: "banzuke", order: 7, span: 4, component: BanzukeWidget, label: "Banzuke" },
  { id: "roster", order: 8, span: 8, component: RosterWidget, label: "Roster" },
  { id: "news", order: 9, span: 4, component: NewsWidget, label: "News" },
  { id: "rivals", order: 10, span: 4, component: RivalsWidget, label: "Rivals" },
  { id: "scouting", order: 11, span: 4, component: ScoutingWidget, label: "Scouting" },
  { id: "institution", order: 12, span: 6, component: InstitutionWidget, label: "Institution" },
];

/** dashboard. */
export default function Dashboard() {
  const { state, hasAutosave, loadFromAutosave } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const isLoaded = !!world;
  const [editMode, setEditMode] = useState(false);
  const [deliberationCandidateId, setDeliberationCandidateId] = useState<string | null>(null);

  const { getOrderedPlacements, onDragStart, onDragOver, onDragEnd, resetLayout } =
    useDashboardLayout(WIDGET_REGISTRY);

  const widgetMap = useMemo(() => new Map(WIDGET_REGISTRY.map((w) => [w.id, w])), []);

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

  // Phase L: Yokozuna Deliberation Trigger
  useEffect(() => {
    if (!world?.events?.rikishi) return;

    // Find the latest promotion deliberation event
    const promotionEvent = Array.from(Object.values(world.events.rikishi))
      .flat()
      .find((e) => e.type === "PROMOTION_DELIBERATION");

    if (promotionEvent && !deliberationCandidateId) {
      setDeliberationCandidateId(promotionEvent.context.rikishiId);
    }
  }, [world?.events, deliberationCandidateId]);

  const deliberationData = useMemo(() => {
    if (!deliberationCandidateId || !world) return null;
    const core = world.rikishi.get(deliberationCandidateId);
    if (!core) return null;

    const promotionEvent = Array.from(Object.values(world.events.rikishi || {}))
      .flat()
      .find(
        (e) =>
          e.type === "PROMOTION_DELIBERATION" && e.context.rikishiId === deliberationCandidateId
      );

    return {
      rikishi: projectRikishi(core, world),
      heyaName: world.heyas.get(core.heyaId)?.name || "Unknown",
      isPlayerRikishi: core.heyaId === world.playerHeyaId,
      verdict: (promotionEvent?.context.status === "favorable" ? "promoted" : "deferred") as
        | "promoted"
        | "deferred",
      reasoning: [
        promotionEvent?.context.status === "favorable"
          ? "The candidate has demonstrated the necessary clinical dominance and media support."
          : "While the stats are there, the council feels the public support is currently insufficient for promotion.",
      ],
    };
  }, [deliberationCandidateId, world]);

  const playerHeya = isLoaded && world?.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  const digest = useMemo(() => {
    if (!world) return null;
    return projectDashboardUIDigest(world);
  }, [world]);

  const alerts = useMemo(() => {
    if (!digest) return [];
    const a: { icon: React.ElementType; text: string; color: string; link: string }[] = [];

    // Alert logic now uses pre-formatted digest data
    if (digest.finances.status === "critical") {
      a.push({
        icon: Wrench,
        text: "Facilities at risk — funds won't cover maintenance",
        color: "text-destructive",
        link: "/office/facilities",
      });
    }

    // Add logic for other alerts from digest...
    return a;
  }, [digest]);

  if (!isLoaded || !world) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse">
        Institutional interface initializing...
      </div>
    );
  }

  const phase = world.cyclePhase;
  const phaseLabel =
    phase === "active_basho"
      ? "Tournament Active"
      : phase === "pre_basho"
        ? "Pre-Basho"
        : phase === "post_basho"
          ? "Post-Basho"
          : "Off-Season";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="glass paper p-6 rounded-lg animate-fade-in relative overflow-hidden">
          {/* Subtle background glow based on phase */}
          <div
            className={cn(
              "absolute inset-0 opacity-5 pointer-events-none transition-all duration-700",
              phase === "active_basho" ? "bg-accent" : "bg-primary"
            )}
          />

          <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden group">
              <span className="text-primary-foreground font-display text-3xl font-bold relative z-10">
                力
              </span>
              <div className="absolute inset-0 rank-shimmer" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-display font-bold leading-none tracking-tight">
                  {playerHeya ? <StableName id={playerHeya.id} name={playerHeya.name} /> : "Stable"}
                </h1>
                <Badge
                  variant="outline"
                  className="px-1.5 h-5 text-[10px] uppercase font-bold text-primary border-primary/20"
                >
                  Control Center
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    <div
                      className={cn(
                        "phase-dot",
                        digest?.phase === "interim" ? "phase-dot--active" : "phase-dot--interim"
                      )}
                    />
                    <div
                      className={cn(
                        "phase-dot",
                        digest?.phase === "pre_basho" ? "phase-dot--active" : "phase-dot--pre"
                      )}
                    />
                    <div
                      className={cn(
                        "phase-dot",
                        digest?.phase === "active_basho"
                          ? "phase-dot--active"
                          : "phase-dot--interim"
                      )}
                    />
                    <div
                      className={cn(
                        "phase-dot",
                        digest?.phase === "post_basho" ? "phase-dot--active" : "phase-dot--post"
                      )}
                    />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                    {phaseLabel}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 border-l border-border/50 pl-4 h-4">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Year {digest?.currentYear}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />{" "}
                    <StableName id={playerHeya?.id || ""} name={digest?.heya.name || ""} /> Center
                  </span>
                  <span className="italic">Week {digest?.currentWeek}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetLayout}
                  className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest gap-2"
                  tooltip="Restore widgets to their default positions and sizes"
                  tooltipSide="bottom"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Layout
                </Button>
              )}
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest gap-2"
                tooltip={
                  editMode
                    ? "Save current widget arrangement"
                    : "Toggle edit mode to rearrange dashboard widgets"
                }
                tooltipSide="bottom"
              >
                <GripVertical className="h-3 w-3" />
                {editMode ? "Confirm Changes" : "Customize Dashboard"}
              </Button>
            </div>
          </div>
        </div>

        {/* ═══════════ ALERTS ═══════════ */}
        {alerts.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
            {alerts.map((alert, i) => (
              <TooltipWrap key={i} content={`Analyze ${alert.text}`} side="top">
                <button
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Alert link type mismatch
                  onClick={() => navigate({ to: alert.link as any })}
                  className="flex items-center gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all duration-200 text-left group hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-1"
                >
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className={cn("h-4 w-4", alert.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-xs font-bold leading-tight", alert.color)}>
                      {alert.text}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      Action required immediately
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </TooltipWrap>
            ))}
          </div>
        )}

        {/* ═══════════ PROGRESSION ARCS ═══════════ */}
        {world && (
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <ProgressionTracker
              ozekiRuns={getOzekiRunCandidates(world)}
              yokozunaCandidates={getYokozunaCandidates(world)}
              kadobanDrama={getKadobanDrama(world)}
              playerHeyaId={world.playerHeyaId || ""}
            />
          </div>
        )}

        {/* ═══════════ WIDGET GRID (12-COLUMN) ═══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-12 gap-6 pb-8">
          {getOrderedPlacements().map((placement, index) => {
            const def = widgetMap.get(placement.id);
            if (!def) return null;
            const Comp = def.component;
            const span = def.span || 4;

            return (
              <div
                key={placement.id}
                className={cn(
                  "flex flex-col widget-enter",
                  span === 12
                    ? "col-span-full"
                    : span === 8
                      ? "xl:col-span-8 md:col-span-2 col-span-1"
                      : span === 6
                        ? "xl:col-span-6 md:col-span-2 col-span-1"
                        : "xl:col-span-4 md:col-span-2 col-span-1"
                )}
                style={{ animationDelay: `${150 + index * 50}ms` }}
              >
                <DraggableWidget
                  widgetId={placement.id}
                  column={placement.column}
                  isEditMode={editMode}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragEnd={onDragEnd}
                >
                  <div className="paper h-full overflow-hidden transition-all duration-300">
                    <Comp />
                  </div>
                </DraggableWidget>
              </div>
            );
          })}
        </div>
      </div>

      {/* FTUE Tour */}
      <OnboardingTourDialog />

      {/* Yokozuna Deliberation Modal */}
      {deliberationData && (
        <YokozunaDeliberation
          {...deliberationData}
          open={!!deliberationCandidateId}
          onClose={() => setDeliberationCandidateId(null)}
        />
      )}
    </AppLayout>
  );
}
