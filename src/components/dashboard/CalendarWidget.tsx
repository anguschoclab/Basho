import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FastForward, ArrowRight, Repeat, Calendar, ChevronRight, SkipForward,
} from "lucide-react";
import { BASHO_CALENDAR, getSeasonalFlavor } from "@/engine/calendar";
import type { BashoName } from "@/engine/types";

const BASHO_NAMES: Record<string, string> = {
  hatsu: "January", haru: "March", natsu: "May",
  nagoya: "July", aki: "September", kyushu: "November",
};

const PHASE_LABELS: Record<string, { label: string; dotClass: string }> = {
  interim:      { label: "Off-Season",  dotClass: "bg-muted-foreground/40" },
  pre_basho:    { label: "Pre-Basho",   dotClass: "bg-primary" },
  active_basho: { label: "Tournament",  dotClass: "bg-accent animate-pulse-glow" },
  post_basho:   { label: "Post-Basho",  dotClass: "bg-primary/60" },
  basho_recap:  { label: "Recap",       dotClass: "bg-muted-foreground/40" },
};

/** calendar widget. */
export function CalendarWidget() {
  const { state, advanceInterim, advanceOneDay, simulateAllBouts, endDay, advanceDay, simFullBasho } = useGame();
  const { toast } = useToast();
  const navigate = useNavigate();
  const world = state.world;
  if (!world) return null;

  const phase = world.cyclePhase || "interim";
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.interim;
  const bashoName = world.currentBashoName || "hatsu";
  const inBasho = phase === "active_basho" && !!world.currentBasho;

  const handleAdvanceDay = () => { advanceOneDay(); toast({ title: "Day advanced" }); };
  const handleAdvanceWeek = () => { advanceInterim(1); toast({ title: "Week advanced" }); };
  const handleSimDay = () => { simulateAllBouts(); endDay(); advanceDay(); toast({ title: "Day simulated" }); };
  const handleSimFullBasho = () => { simFullBasho(); toast({ title: "Basho complete!", description: "All 15 days simulated." }); navigate("/basho"); };

  // Basho day progress (1-15)
  const bashoDay = inBasho && world.currentBasho ? world.currentBasho.day : 0;
  const dayProgress = bashoDay > 0 ? (bashoDay / 15) * 100 : 0;

  return (
    <div className="widget-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calendar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${phaseInfo.dotClass}`} />
          <span className="text-[10px] font-medium text-muted-foreground">{phaseInfo.label}</span>
        </div>
      </div>

      {/* Date display */}
      <div className="space-y-1">
        <div className="font-display text-2xl font-bold leading-tight">
          {bashoName.charAt(0).toUpperCase() + bashoName.slice(1)} {world.year}
        </div>
        <div className="text-sm text-muted-foreground">
          Week {world.calendar?.currentWeek ?? world.week}
          {inBasho && world.currentBasho && (
            <span className="ml-2 font-medium text-foreground">
              · Day {world.currentBasho.day}<span className="font-display text-xs ml-0.5">日目</span>
            </span>
          )}
        </div>
      </div>

      {/* Basho day progress bar */}
      {inBasho && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Day 1</span>
            <span>千秋楽 Day 15</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Next basho indicator with seasonal flavor */}
      {!inBasho && (() => {
        const info = BASHO_CALENDAR[bashoName as BashoName];
        const season = info?.season;
        const flavorText = season ? getSeasonalFlavor(season, world.seed) : null;
        return (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">
              Next: <span className="font-medium text-foreground">{BASHO_NAMES[bashoName] || bashoName} Basho</span>
              {info?.location && <span className="ml-1 opacity-70">· {info.location}</span>}
            </div>
            {flavorText && (
              <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">{flavorText}</p>
            )}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {!inBasho ? (
          <>
            <Button size="sm" variant="secondary" onClick={handleAdvanceDay} className="gap-1.5 h-7 text-xs">
              <ArrowRight className="h-3 w-3" /> Day
            </Button>
            <Button size="sm" variant="secondary" onClick={handleAdvanceWeek} className="gap-1.5 h-7 text-xs">
              <Repeat className="h-3 w-3" /> Week
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={handleSimDay} className="gap-1.5 h-7 text-xs">
              <FastForward className="h-3 w-3" /> Sim Day
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSimFullBasho} className="gap-1.5 h-7 text-xs">
              <SkipForward className="h-3 w-3" /> Sim All
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/schedule")} className="gap-1.5 h-7 text-xs">
              <Calendar className="h-3 w-3" /> Schedule
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/basho")} className="gap-1.5 h-7 text-xs">
              <ChevronRight className="h-3 w-3" /> Basho
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
