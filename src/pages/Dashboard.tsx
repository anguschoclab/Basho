import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { GripVertical, RotateCcw } from "lucide-react";

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
import { DraggableWidget } from "@/components/dashboard/DraggableWidget";
import { useDashboardLayout, type WidgetDef } from "@/hooks/useDashboardLayout";

const WIDGET_REGISTRY: WidgetDef[] = [
  // Column 0
  { id: "calendar",  column: 0, order: 0, component: CalendarWidget,  label: "Calendar" },
  { id: "stable",    column: 0, order: 1, component: StableWidget,    label: "Stable" },
  { id: "training",  column: 0, order: 2, component: TrainingWidget,  label: "Training" },
  { id: "finances",  column: 0, order: 3, component: FinancesWidget,  label: "Finances" },
  // Column 1
  { id: "basho",     column: 1, order: 0, component: BashoWidget,     label: "Basho" },
  { id: "banzuke",   column: 1, order: 1, component: BanzukeWidget,   label: "Banzuke" },
  // Column 2
  { id: "roster",    column: 2, order: 0, component: RosterWidget,    label: "Roster" },
  { id: "scouting",  column: 2, order: 1, component: ScoutingWidget,  label: "Scouting" },
  { id: "news",      column: 2, order: 2, component: NewsWidget,      label: "News" },
  { id: "rivals",    column: 2, order: 3, component: RivalsWidget,    label: "Rivals" },
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
    if (state.phase === "basho_recap") {
      navigate("/recap");
    }
  }, [state.phase, navigate]);

  useEffect(() => {
    if (!isLoaded && hasAutosave()) {
      loadFromAutosave();
      return;
    }
    if (!isLoaded && !hasAutosave()) {
      navigate("/main-menu", { replace: true });
    }
  }, [isLoaded, hasAutosave, loadFromAutosave, navigate]);

  if (!isLoaded || !world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  const columns = getColumns();

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-4">
        {/* Portal header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display text-lg font-bold">力</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-display font-bold leading-tight">
              {playerHeya?.name || "Stable"} — Oyakata Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              {world.year} · {world.currentBashoName?.charAt(0).toUpperCase()}{world.currentBashoName?.slice(1)} · Week {world.calendar?.currentWeek ?? world.week}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLayout}
                className="h-7 text-xs gap-1 text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
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
            Drag widgets to rearrange your dashboard. Changes are saved automatically.
          </p>
        )}

        {/* FM-style modular grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="space-y-4 pl-4">
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
              {/* Drop zone at bottom of column for receiving widgets */}
              {editMode && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    // Place at end of this column — use last item or sentinel
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
