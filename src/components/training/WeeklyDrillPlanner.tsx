/**
 * WeeklyDrillPlanner.tsx
 * =====================
 * High-performance management interface for scheduling rikishi drills.
 * Featuring Batch Actions, Multi-select, and Intelligent Autoset.
 * (Phase O: Weekly Training Plans)
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Dumbbell,
  Zap,
  Users2,
  Wind,
  Coffee,
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
import { DRILL_METADATA } from "@/engine/systems/training/TrainingConstants";

interface WeeklyDrillPlannerProps {
  rikishiList: Rikishi[];
  weeklyPlan: Record<string, Record<number, DrillType>>;
  onPlanUpdate: (rikishiId: string, day: number, drillType: DrillType) => void;
  onBulkUpdate: (rikishiId: string, daySchedule: Record<number, DrillType>) => void;
  onMultiBulkUpdate: (rikishiIds: string[], daySchedule: Record<number, DrillType>) => void;
}

const DAYS = [
  { id: 1, label: "Mon", short: "M" },
  { id: 2, label: "Tue", short: "T" },
  { id: 3, label: "Wed", short: "W" },
  { id: 4, label: "Thu", short: "T" },
  { id: 5, label: "Fri", short: "F" },
  { id: 6, label: "Sat", short: "S" },
];

const DRILL_ICONS: Record<DrillType, React.ReactNode> = {
  asageiko: <Calendar className="h-3 w-3" />,
  butsukari: <Dumbbell className="h-3 w-3" />,
  teppo: <Zap className="h-3 w-3" />,
  "moushi-ai": <Users2 className="h-3 w-3" />,
  shindo: <Wind className="h-3 w-3" />,
  none: <Coffee className="h-3 w-3" />,
};

export function WeeklyDrillPlanner({
  rikishiList,
  weeklyPlan,
  onPlanUpdate,
  onBulkUpdate,
  onMultiBulkUpdate,
}: WeeklyDrillPlannerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAllSelected = rikishiList.length > 0 && selectedIds.size === rikishiList.length;

  const handleFillWeek = (rikishiId: string, drill: DrillType) => {
    const schedule: Record<number, DrillType> = {};
    DAYS.forEach((d) => {
      schedule[d.id] = drill;
    });
    onBulkUpdate(rikishiId, schedule);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rikishiList.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchAssign = (drillType: DrillType) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const schedule: Record<number, DrillType> = {};
    DAYS.forEach((d) => {
      schedule[d.id] = drillType;
    });

    onMultiBulkUpdate(ids, schedule);
  };

  const handleAutoSetPlan = () => {
    // Logic: Assign drills based on archetype
    rikishiList.forEach((rikishi) => {
      // If we have selected IDs, only autoset those, otherwise autoset all
      if (selectedIds.size > 0 && !selectedIds.has(rikishi.id)) return;

      const arch = rikishi.archetype ?? rikishi.combatProfile?.archetype ?? "hybrid";
      const schedule: Record<number, DrillType> = {};

      DAYS.forEach((d) => {
        // Mon, Wed, Fri: Primary Drill
        // Tue, Thu: Secondary/Technique
        // Sat: Shindo/Recovery
        if (d.id === 6) {
          schedule[d.id] = "shindo";
        } else if ([1, 3, 5].includes(d.id)) {
          if (arch === "oshi" || arch === "tsuppari") schedule[d.id] = "teppo";
          else if (arch === "yotsu" || arch === "giant") schedule[d.id] = "butsukari";
          else schedule[d.id] = "moushi-ai";
        } else {
          schedule[d.id] = "asageiko";
        }
      });

      onBulkUpdate(rikishi.id, schedule);
    });
  };

  return (
    <section className="space-y-6 pt-10 border-t-2 border-dashed">
      {/* Header & Controls */}
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
            onClick={handleAutoSetPlan}
            className="border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 font-black uppercase tracking-widest text-[10px] gap-2 h-11"
          >
            <Wand2 className="h-4 w-4 text-primary" />
            Autoset Training
          </Button>
          <Badge
            variant="outline"
            className="px-4 py-1.5 bg-background border-2 font-black uppercase tracking-widest text-[9px] h-11 flex items-center"
          >
            INTERIM WEEK
          </Badge>
        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary text-primary-foreground p-3 rounded-lg flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black uppercase tracking-widest">
              {selectedIds.size} Rikishi Selected
            </span>
            <div className="h-4 w-px bg-primary-foreground/20" />
            <span className="text-[10px] uppercase font-bold opacity-80">Assign to all:</span>
            <Select onValueChange={(v) => handleBatchAssign(v as DrillType)}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 h-8 text-[10px] font-bold uppercase">
                <SelectValue placeholder="Select Drill..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DRILL_METADATA).map(([key, m]) => (
                  <SelectItem key={key} value={key} className="text-[10px] uppercase font-black">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-2 overflow-x-auto pb-4">
        {/* Header Row */}
        <div className="min-w-[900px] grid grid-cols-[40px_220px_repeat(6,1fr)_80px] gap-2 px-2 py-3 bg-muted/50 rounded-t-xl border border-dashed text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="h-8 w-8 flex items-center justify-center hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm"
              aria-label={isAllSelected ? "Deselect all rikishi" : "Select all rikishi"}
            >
              {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
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

        {rikishiList.map((rikishi) => {
          const schedule = weeklyPlan[rikishi.id] || {};
          const isSelected = selectedIds.has(rikishi.id);
          const fb = toFatigueBand(rikishi.fatigue ?? 0);
          const isExhausted = fb === "exhausted" || fb === "spent";

          return (
            <div
              key={rikishi.id}
              className={cn(
                "min-w-[900px] grid grid-cols-[40px_220px_repeat(6,1fr)_80px] gap-2 items-center p-2 rounded-lg transition-all",
                isSelected
                  ? "bg-primary/10 border-primary/40"
                  : "bg-background border-border/40 hover:border-primary/20",
                "border"
              )}
            >
              {/* Checkbox Cell */}
              <div className="flex justify-center">
                <button
                  onClick={() => toggleSelect(rikishi.id)}
                  className={cn(
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm",
                    isSelected ? "text-primary" : "text-muted-foreground/30 hover:text-primary"
                  )}
                  aria-label={
                    isSelected ? `Deselect ${rikishi.shikona}` : `Select ${rikishi.shikona}`
                  }
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
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
                  <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    <span
                      className={cn(isExhausted ? "text-destructive font-bold" : "text-success")}
                    >
                      {FATIGUE_LABELS[fb].split(" ")[0]}
                    </span>
                    <span className="opacity-20">|</span>
                    <span>{rikishi.rank}</span>
                  </div>
                </div>
              </div>

              {/* Day Cells */}
              {DAYS.map((day) => {
                const drill = schedule[day.id] || "asageiko";
                const meta = DRILL_METADATA[drill];
                return (
                  <div key={day.id} className="relative">
                    <Select
                      value={drill}
                      onValueChange={(v) => onPlanUpdate(rikishi.id, day.id, v as DrillType)}
                    >
                      <SelectTrigger
                        className={cn(
                          "h-14 w-full border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all",
                          drill === "none" ? "bg-muted/10 opacity-40" : "bg-background",
                          drill === "butsukari" && "border-warning/40 text-warning bg-warning/5",
                          drill === "teppo" && "border-primary/40 text-primary bg-primary/5",
                          drill === "moushi-ai" && "border-west/40 text-west bg-west/5",
                          drill === "shindo" && "border-success/40 text-success bg-success/5",
                          "hover:border-primary hover:bg-primary/5 hover:scale-[1.02] shadow-sm"
                        )}
                      >
                        <div className="shrink-0">{DRILL_ICONS[drill]}</div>
                        <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">
                          {meta.label}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DRILL_METADATA).map(([key, m]) => (
                          <SelectItem
                            key={key}
                            value={key}
                            className="text-[10px] uppercase font-black"
                          >
                            <div className="flex items-center gap-2">
                              {DRILL_ICONS[key as DrillType]}
                              <span>{m.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {/* Action Cell */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground/40 hover:text-destructive"
                  aria-label={`Reset weekly schedule for ${rikishi.shikona}`}
                  onClick={() => handleFillWeek(rikishi.id, "asageiko")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dossier-paper p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 border-2 border-primary/20 shadow-2xl bg-primary/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 bg-primary text-[8px] font-black uppercase text-white px-3 rotate-45 translate-x-4 translate-y-2">
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
            <span className="font-bold text-warning">Butsukari</span> provide massive Power gains
            but will exhaust your rikishi. Use{" "}
            <span className="font-bold text-success text-[10px] bg-success/10 px-1 rounded">
              SHINDO
            </span>{" "}
            to recover mental stability and reduce burnout risk.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] px-10 h-12 shadow-xl hover:shadow-primary/40 transition-all">
              SUBMIT TRAINING PLAN
            </Button>
            <div className="flex items-center gap-4 border-l border-primary/10 pl-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50">
                  Last submitted
                </span>
                <span className="text-[10px] font-black text-primary uppercase">NEVER</span>
              </div>
              <Badge
                variant="outline"
                className="border-dashed border-primary/30 text-[9px] font-black"
              >
                6-DAY CYCLE
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
