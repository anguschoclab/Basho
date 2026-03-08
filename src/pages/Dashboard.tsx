import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, RotateCcw, AlertTriangle, Wrench, Coins, Shield, ChevronRight } from "lucide-react";
import { getMonthlyMaintenanceCost } from "@/engine/facilities";

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
import { FacilitiesWidget } from "@/components/dashboard/FacilitiesWidget";
import { DigestWidget } from "@/components/dashboard/DigestWidget";
import { DraggableWidget } from "@/components/dashboard/DraggableWidget";
import { useDashboardLayout, type WidgetDef } from "@/hooks/useDashboardLayout";

const WIDGET_REGISTRY: WidgetDef[] = [
  // Column 0 — Time & Stable Management
  { id: "calendar",   column: 0, order: 0, component: CalendarWidget,   label: "Calendar" },
  { id: "stable",     column: 0, order: 1, component: StableWidget,     label: "Stable" },
  { id: "training",   column: 0, order: 2, component: TrainingWidget,   label: "Training" },
  { id: "finances",   column: 0, order: 3, component: FinancesWidget,   label: "Finances" },
  { id: "facilities", column: 0, order: 4, component: FacilitiesWidget, label: "Facilities" },
  // Column 1 — Competition
  { id: "basho",      column: 1, order: 0, component: BashoWidget,      label: "Basho" },
  { id: "banzuke",    column: 1, order: 1, component: BanzukeWidget,    label: "Banzuke" },
  { id: "digest",     column: 1, order: 2, component: DigestWidget,     label: "Weekly Digest" },
  // Column 2 — Intelligence
  { id: "roster",     column: 2, order: 0, component: RosterWidget,     label: "Roster" },
  { id: "scouting",   column: 2, order: 1, component: ScoutingWidget,   label: "Scouting" },
  { id: "news",       column: 2, order: 2, component: NewsWidget,       label: "News" },
  { id: "rivals",     column: 2, order: 3, component: RivalsWidget,     label: "Rivals" },
];

const COLUMN_COUNT = 3;

export default function Dashboard() {
  const { state, hasAutosave, loadFromAutosave } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const isLoaded = !!world;
  const [editMode, setEditMode] = useState(false);

  const { getColumns, onDragStart, onDragOver, onDragEnd, resetLayout } =
    useDashboardLayout(WIDGET_REGISTRY, COLUMN_COUNT);

  const widgetMap = useMemo(
    () => new Map(WIDGET_REGISTRY.map(w => [w.id, w])),
    []
  );

  useEffect(() => {
    if (state.phase === "basho_recap") navigate("/recap");
  }, [state.phase, navigate]);

  useEffect(() => {
    if (!isLoaded && hasAutosave()) {
      loadFromAutosave();
    } else if (!isLoaded && !hasAutosave()) {
      navigate("/main-menu", { replace: true });
    }
  }, [isLoaded, hasAutosave, loadFromAutosave, navigate]);

  const playerHeya = (isLoaded && world?.playerHeyaId) ? world.heyas.get(world.playerHeyaId) : null;
  const columns = getColumns();

  // Alerts
  const alerts = useMemo(() => {
    if (!playerHeya) return [];
    const a: { icon: any; text: string; color: string; link: string }[] = [];
    const maintenance = getMonthlyMaintenanceCost(playerHeya);
    if (playerHeya.funds < maintenance) {
      a.push({ icon: Wrench, text: "Facilities at risk — funds won't cover maintenance", color: "text-destructive", link: "/stable" });
    }
    if (playerHeya.riskIndicators?.financial) {
      a.push({ icon: Coins, text: "Financial distress — high insolvency risk", color: "text-destructive", link: "/economy" });
    }
    if (playerHeya.riskIndicators?.governance) {
      a.push({ icon: Shield, text: "Governance watch — JSA has concerns", color: "text-warning", link: "/governance" });
    }
    return a;
  }, [playerHeya]);

  if (!isLoaded || !world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  const phase = world.cyclePhase;
  const phaseLabel = phase === "active_basho" ? "Tournament Active"
    : phase === "pre_basho" ? "Pre-Basho"
    : phase === "post_basho" ? "Post-Basho"
    : "Off-Season";

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-4">
        {/* ═══════════ HEADER ═══════════ */}
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display text-xl font-bold">力</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display font-bold leading-tight truncate">
              {playerHeya?.name || "Stable"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{world.year}</span>
              <span>·</span>
              <span className="capitalize">{world.currentBashoName}</span>
              <span>·</span>
              <span>Week {world.calendar?.currentWeek ?? world.week}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 ml-1">{phaseLabel}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {editMode && (
              <Button variant="ghost" size="sm" onClick={resetLayout} className="h-7 text-xs gap-1 text-muted-foreground">
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            )}
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="h-7 text-xs gap-1"
            >
              <GripVertical className="h-3 w-3" />
              {editMode ? "Done" : "Customize"}
            </Button>
          </div>
        </div>

        {editMode && (
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
            Drag widgets to rearrange. Changes save automatically.
          </p>
        )}

        {/* ═══════════ ALERTS ═══════════ */}
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <button
                key={i}
                onClick={() => navigate(alert.link)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors text-left group"
              >
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${alert.color}`} />
                <span className={`text-xs font-medium flex-1 ${alert.color}`}>{alert.text}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}

        {/* ═══════════ WIDGET GRID ═══════════ */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="space-y-4">
              {col.map((placement) => {
                const def = widgetMap.get(placement.id);
                if (!def) return null;
                const Comp = def.component;
                return (
                  <DraggableWidget
                    key={placement.id}
                    widgetId={placement.id}
                    column={colIdx}
                    label={def.label}
                    isEditMode={editMode}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                  >
                    <Comp />
                  </DraggableWidget>
                );
              })}
              {editMode && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    const lastId = col.length > 0 ? col[col.length - 1].id : `__col_${colIdx}`;
                    onDragOver(lastId, colIdx);
                  }}
                  onDrop={(e) => e.preventDefault()}
                  className="min-h-[48px] rounded-lg border-2 border-dashed border-border/30 transition-colors hover:border-primary/40 hover:bg-primary/5"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
