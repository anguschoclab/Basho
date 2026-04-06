import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { SaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { useAutosaveIndicator } from "@/hooks/useAutosaveIndicator";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  Sun,
  Moon,
  ChevronRight,
  Wallet,
  Calendar,
  Settings,
  Trophy,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";

const RUNWAY_COLORS: Record<string, string> = {
  secure: "text-emerald-500",
  comfortable: "text-green-500",
  tight: "text-yellow-500",
  critical: "text-destructive",
  desperate: "text-destructive",
};

/**
 * top nav bar.
 * FM-inspired global context bar.
 */
export function TopNavBar({ eventLogOpen, onToggleEventLog }: { eventLogOpen: boolean; onToggleEventLog: () => void }) {
  const { state, advanceOneDay } = useGame();
  const { setTheme, resolvedTheme } = useTheme();
  const autosaveStatus = useAutosaveIndicator();
  const navigate = useNavigate();
  const world = state.world;

  const playerHeya = world?.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day ?? 1;
  const isPreBasho = world?.cyclePhase === "pre_basho";
  const isPostBasho = world?.cyclePhase === "post_basho";

  const dateLabel = world
    ? `Year ${world.calendar?.year ?? world.year} · Week ${world.calendar?.currentWeek ?? world.week}`
    : "Initializing...";

  const phaseLabel = inBasho
    ? `Day ${bashoDay} of 15`
    : isPreBasho
    ? "Pre-Basho Prep"
    : isPostBasho
    ? "Post-Basho Review"
    : "Training";

  const handleContinue = () => {
    if (!world) return;
    advanceOneDay();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/50">
      {/* Main bar */}
      <div className="h-14 flex items-center justify-between px-4">
        {/* Left: Sidebar trigger + context info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TooltipWrap content="Collapse/Expand side navigation" side="right">
              <SidebarTrigger />
            </TooltipWrap>
            <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
          </div>

          <div className="hidden lg:flex items-center gap-6">
            {/* Date / Phase */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{dateLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold leading-tight">{phaseLabel}</span>
                {inBasho && (
                  <Badge variant="outline" className="h-4 text-[9px] px-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    Tournament
                  </Badge>
                )}
              </div>
            </div>

            {/* Funds */}
            {playerHeya && (
              <TooltipWrap
                content={
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Balance: ¥{playerHeya.funds.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Runway: {playerHeya.runwayBand}</p>
                  </div>
                }
                side="bottom"
              >
                <div className="flex flex-col cursor-help">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Funds</span>
                  </div>
                  <span className={`text-sm font-bold leading-tight ${playerHeya.funds < 0 ? "text-destructive" : (RUNWAY_COLORS[playerHeya.runwayBand ?? ""] ?? "text-foreground")}`}>
                    ¥{playerHeya.funds.toLocaleString()}
                  </span>
                </div>
              </TooltipWrap>
            )}
          </div>
        </div>

        {/* Right: controls + Continue button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2 px-3 border-r border-border/50 h-6 hidden sm:flex">
            {world && autosaveStatus !== "idle" && (
              <div className={`h-2 w-2 rounded-full mr-2 ${autosaveStatus === "saving" ? "bg-primary animate-pulse" : "bg-emerald-500"}`} />
            )}
            <SaveLoadDialog />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              tooltip={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              tooltipSide="bottom"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => navigate({ to: "/settings" as any })}
              tooltip="Settings"
              tooltipSide="bottom"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {world && (
            <Button
              size="lg"
              className={`
                h-10 px-6 gap-2 font-bold shadow-lg
                transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                ${inBasho
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"}
              `}
              onClick={handleContinue}
              tooltip={inBasho ? "Advance to next day of tournament" : "Advance the simulation one day"}
              tooltipSide="left"
            >
              <span className="hidden sm:inline">{inBasho ? "Next Day" : "Continue"}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Basho progress strip — visible only during active tournament */}
      {inBasho && (
        <div className="h-0.5 w-full bg-border/50">
          <div
            className="h-0.5 bg-amber-500 transition-all duration-700"
            style={{ width: `${(bashoDay / 15) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}
