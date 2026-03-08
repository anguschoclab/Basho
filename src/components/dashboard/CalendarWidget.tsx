import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Play, FastForward, ArrowRight, Repeat, Calendar, ChevronRight, SkipForward,
} from "lucide-react";

const BASHO_NAMES: Record<string, string> = {
  hatsu: "January", haru: "March", natsu: "May",
  nagoya: "July", aki: "September", kyushu: "November",
};

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  interim: { label: "Off-Season", color: "bg-muted text-muted-foreground" },
  pre_basho: { label: "Pre-Basho", color: "bg-primary/10 text-primary" },
  active_basho: { label: "Tournament", color: "bg-accent/10 text-accent" },
  post_basho: { label: "Post-Basho", color: "bg-primary/10 text-primary" },
  basho_recap: { label: "Recap", color: "bg-muted text-muted-foreground" },
};

export function CalendarWidget() {
  const { state, advanceInterim, advanceOneDay, startBasho, simulateAllBouts, endDay, advanceDay, simFullBasho } = useGame();
  const { toast } = useToast();
  const navigate = useNavigate();
  const world = state.world;
  if (!world) return null;

  const phase = world.cyclePhase || "interim";
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.interim;
  const bashoName = world.currentBashoName || "hatsu";
  const inBasho = phase === "active_basho" && !!world.currentBasho;

  const handleAdvanceDay = () => {
    advanceOneDay();
    toast({ title: "Day advanced" });
  };

  const handleAdvanceWeek = () => {
    advanceInterim(1);
    toast({ title: "Week advanced" });
  };

  const handleStartBasho = () => {
    startBasho();
    toast({ title: "Basho started!" });
    navigate("/basho");
  };

  const handleSimDay = () => {
    simulateAllBouts();
    endDay();
    advanceDay();
    toast({ title: "Day simulated" });
  };

  const handleSimFullBasho = () => {
    simFullBasho();
    toast({ title: "Basho complete!", description: "All 15 days simulated." });
    navigate("/basho");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calendar</span>
        </div>
        <Badge className={`text-[10px] ${phaseInfo.color}`}>{phaseInfo.label}</Badge>
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
              · Day {world.currentBasho.day}日目
            </span>
          )}
        </div>
      </div>

      {/* Next basho indicator */}
      {!inBasho && (
        <div className="text-xs text-muted-foreground">
          Next: <span className="font-medium text-foreground">{BASHO_NAMES[bashoName] || bashoName} Basho</span>
        </div>
      )}

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
            <Button size="sm" onClick={handleStartBasho} className="gap-1.5 h-7 text-xs">
              <Play className="h-3 w-3" /> Start Basho
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={handleSimDay} className="gap-1.5 h-7 text-xs">
              <FastForward className="h-3 w-3" /> Sim Day
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/basho")} className="gap-1.5 h-7 text-xs">
              <ChevronRight className="h-3 w-3" /> View Basho
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
