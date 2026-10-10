/**
 * WeeklyDrillPlannerSections.tsx
 *
 * Sections of WeeklyDrillPlanner — header controls, batch toolbar,
 * the per-rikishi drill grid, and the regimen footer.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Dumbbell,
  Zap,
  Users2,
  Wind,
  Coffee,
  Activity,
  ArrowRightCircle,
  RotateCcw,
  CheckSquare,
  Square,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RikishiName } from "@/components/ClickableName";
import { FATIGUE_LABELS, toFatigueBand } from "@/presenters/uiDigest";
import type { DrillType } from "@/engine/types/training";
import type { Rikishi } from "@/engine/types";
import { DRILL_METADATA } from "@/constants/engine/training";
import { DAYS, type useDrillPlanner } from "@/hooks/useDrillPlanner";

type Planner = ReturnType<typeof useDrillPlanner>;

const DRILL_ICONS: Record<DrillType, ReactNode> = {
  asageiko: <Calendar className="h-3 w-3" />,
  butsukari: <Dumbbell className="h-3 w-3" />,
  teppo: <Zap className="h-3 w-3" />,
  "moushi-ai": <Users2 className="h-3 w-3" />,
  shindo: <Wind className="h-3 w-3" />,
  shiko: <Activity className="h-3 w-3" />,
  none: <Coffee className="h-3 w-3" />,
};

const DRILL_OPTIONS_BATCH: ReactNode[] = [];
const DRILL_OPTIONS_CELL: ReactNode[] = [];
for (const key in DRILL_METADATA) {
  if (Object.prototype.hasOwnProperty.call(DRILL_METADATA, key)) {
    const m = DRILL_METADATA[key];
    DRILL_OPTIONS_BATCH.push(
      <SelectItem key={key} value={key} className="text-[10px] uppercase font-black">
        {m.label}
      </SelectItem>
    );
    DRILL_OPTIONS_CELL.push(
      <SelectItem key={key} value={key} className="text-[10px] uppercase font-black">
        <div className="flex items-center gap-2">
          {DRILL_ICONS[key as DrillType]}
          <span>{m.label}</span>
        </div>
      </SelectItem>
    );
  }
}

/** Header row: title + autoset + week badge. */
export function PlannerHeader({ planner }: { planner: Planner }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl shadow-inner">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">
            Weekly Training Scheduler
          </h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
            Pro-active drill orchestration for high-performance stable management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={planner.handleAutoSetPlan}
          className="border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 font-black uppercase tracking-widest text-[10px] gap-2 h-11"
        >
          <Wand2 className="h-4 w-4 text-primary" />
          Autoset Training
        </Button>
        <Badge
          variant="outline"
          className="px-4 py-1.5 bg-background border-2 font-black uppercase tracking-widest text-[10px] h-11 flex items-center"
        >
          INTERIM WEEK
        </Badge>
      </div>
    </div>
  );
}

/** Floating batch-assign toolbar shown when rikishi are selected. */
export function BatchToolbar({ planner }: { planner: Planner }) {
  if (planner.selectedIds.size === 0) return null;
  return (
    <div className="bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-4">
        <span className="text-xs font-black uppercase tracking-widest">
          {planner.selectedIds.size} Rikishi Selected
        </span>
        <div className="h-4 w-px bg-primary-foreground/20" />
        <span className="text-[10px] uppercase font-bold opacity-80">Assign to all:</span>
        <Select onValueChange={(v) => planner.handleBatchAssign(v as DrillType)}>
          <SelectTrigger className="w-40 bg-foreground/10 border-foreground/20 h-8 text-[10px] font-bold uppercase">
            <SelectValue placeholder="Select Drill..." />
          </SelectTrigger>
          <SelectContent>{DRILL_OPTIONS_BATCH}</SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-[10px] font-black uppercase tracking-widest hover:bg-foreground/10"
        onClick={() => planner.setSelectedIds(new Set())}
      >
        Clear Selection
      </Button>
    </div>
  );
}

const GRID_COLS = "min-w-[900px] grid grid-cols-[40px_220px_repeat(6,1fr)_80px] gap-2";

/** Grid header row with the select-all checkbox. */
function GridHeader({ planner }: { planner: Planner }) {
  return (
    <div
      className={cn(
        GRID_COLS,
        "px-2 py-3 bg-muted/50 rounded-t-xl border border-dashed text-[10px] font-black uppercase tracking-widest text-muted-foreground"
      )}
    >
      <div className="flex justify-center">
        <button
          type="button"
          onClick={planner.toggleSelectAll}
          className="h-8 w-8 flex items-center justify-center hover:text-primary transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs"
          aria-label={planner.isAllSelected ? "Deselect all rikishi" : "Select all rikishi"}
        >
          {planner.isAllSelected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="pl-4">RIKISHI ROSTER</div>
      {DAYS.map((day) => (
        <div key={day.id} className="text-center">
          {day.label}
        </div>
      ))}
      <div className="text-center">CLEAR</div>
    </div>
  );
}

/** Per-day drill select cell. */
function DayCell({
  rikishiId,
  day,
  schedule,
  onPlanUpdate,
}: {
  rikishiId: string;
  day: (typeof DAYS)[number];
  schedule: Record<number, DrillType>;
  onPlanUpdate: (rikishiId: string, day: number, drillType: DrillType) => void;
}) {
  const drill = schedule[day.id] || "asageiko";
  const meta = DRILL_METADATA[drill];
  return (
    <div className="relative">
      <Select value={drill} onValueChange={(v) => onPlanUpdate(rikishiId, day.id, v as DrillType)}>
        <SelectTrigger
          className={cn(
            "h-14 w-full border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all",
            drill === "none" ? "bg-muted/10 opacity-40" : "bg-background",
            drill === "butsukari" && "border-warning/40 text-warning bg-warning/5",
            drill === "teppo" && "border-primary/40 text-primary bg-primary/5",
            drill === "moushi-ai" && "border-west/40 text-west bg-west/5",
            drill === "shindo" && "border-success/40 text-success bg-success/5",
            "hover:border-primary hover:bg-primary/5 hover:scale-[1.02] shadow-xs"
          )}
        >
          <div className="shrink-0">{DRILL_ICONS[drill]}</div>
          <span className="text-[10px] font-black uppercase tracking-tighter hidden md:block">
            {meta.label}
          </span>
        </SelectTrigger>
        <SelectContent>{DRILL_OPTIONS_CELL}</SelectContent>
      </Select>
    </div>
  );
}

/** One rikishi row: checkbox, profile, day cells, reset. */
function RikishiRow({
  rikishi,
  schedule,
  planner,
  onPlanUpdate,
}: {
  rikishi: Rikishi;
  schedule: Record<number, DrillType>;
  planner: Planner;
  onPlanUpdate: (rikishiId: string, day: number, drillType: DrillType) => void;
}) {
  const isSelected = planner.selectedIds.has(rikishi.id);
  const fb = toFatigueBand(rikishi.fatigue ?? 0);
  const isExhausted = fb === "exhausted" || fb === "spent";

  return (
    <div
      className={cn(
        GRID_COLS,
        "items-center p-2 rounded-lg transition-all",
        isSelected
          ? "bg-primary/10 border-primary/40"
          : "bg-background border-border/40 hover:border-primary/20",
        "border"
      )}
    >
      {/* Checkbox Cell */}
      <div className="flex justify-center">
        <button
          onClick={() => planner.toggleSelect(rikishi.id)}
          className={cn(
            "transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs",
            isSelected ? "text-primary" : "text-muted-foreground/30 hover:text-primary"
          )}
          aria-label={isSelected ? `Deselect ${rikishi.shikona}` : `Select ${rikishi.shikona}`}
        >
          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
      </div>

      {/* Profile Cell */}
      <div className="flex items-center gap-3 pl-2">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center font-display font-black text-xs shrink-0 shadow-inner",
            rikishi.injured
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {rikishi.shikona.charAt(0)}
        </div>
        <div className="min-w-0 pr-4">
          <div className="font-display font-black text-sm uppercase tracking-tighter truncate">
            <RikishiName id={rikishi.id} name={rikishi.shikona} />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <span className={cn(isExhausted ? "text-destructive font-bold" : "text-success")}>
              {FATIGUE_LABELS[fb].split(" ")[0]}
            </span>
            <span className="opacity-20">|</span>
            <span>{rikishi.rank}</span>
          </div>
        </div>
      </div>

      {/* Day Cells */}
      {DAYS.map((day) => (
        <DayCell
          key={day.id}
          rikishiId={rikishi.id}
          day={day}
          schedule={schedule}
          onPlanUpdate={onPlanUpdate}
        />
      ))}

      {/* Action Cell */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground/40 hover:text-destructive"
          aria-label={`Reset weekly schedule for ${rikishi.shikona}`}
          tooltip={`Reset weekly schedule for ${rikishi.shikona}`}
          onClick={() => planner.handleFillWeek(rikishi.id, "asageiko")}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** The full roster × days drill grid. */
export function DrillGrid({
  rikishiList,
  weeklyPlan,
  planner,
  onPlanUpdate,
}: {
  rikishiList: Rikishi[];
  weeklyPlan: Record<string, Record<number, DrillType>>;
  planner: Planner;
  onPlanUpdate: (rikishiId: string, day: number, drillType: DrillType) => void;
}) {
  return (
    <div className="grid gap-2 overflow-x-auto pb-4">
      <GridHeader planner={planner} />
      {rikishiList.map((rikishi) => (
        <RikishiRow
          key={rikishi.id}
          rikishi={rikishi}
          schedule={weeklyPlan[rikishi.id] || {}}
          planner={planner}
          onPlanUpdate={onPlanUpdate}
        />
      ))}
    </div>
  );
}

/** "Ready for tick" regimen footer card. */
export function RegimenFooter() {
  return (
    <div className="dossier-paper p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 border-2 border-primary/20 shadow-2xl bg-primary/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 bg-primary text-[10px] font-black uppercase text-white px-3 rotate-45 translate-x-4 translate-y-2">
        READY FOR TICK
      </div>
      <div className="h-16 w-16 bg-primary text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform">
        <ArrowRightCircle className="h-10 w-10" />
      </div>
      <div className="space-y-3 flex-1">
        <h3 className="text-2xl font-display font-black uppercase tracking-tight">
          Professional Regimen Ready
        </h3>
        <p className="text-[11px] text-muted-foreground italic leading-relaxed max-w-2xl font-medium">
          Confirm your weekly training allocation. High-intensity drills like{" "}
          <span className="font-bold text-warning">Butsukari</span> provide massive Power gains but
          will exhaust your rikishi. Use{" "}
          <span className="font-bold text-success text-[10px] bg-success/10 px-1 rounded">
            SHINDO
          </span>{" "}
          to recover mental stability and reduce burnout risk.
        </p>
        <div className="pt-2">
          <Badge
            variant="outline"
            className="border-dashed border-primary/30 text-[10px] font-black"
          >
            SAVED AUTOMATICALLY — APPLIES WEEKLY
          </Badge>
        </div>
      </div>
    </div>
  );
}
