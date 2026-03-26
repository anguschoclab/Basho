import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { SaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { useAutosaveIndicator } from "@/hooks/useAutosaveIndicator";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  ChevronRight,
  TrendingUp,
  Wallet,
  Calendar,
  Settings,
  Menu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
  const bashoDay = world?.currentBasho?.day;

  // Format date display
  const dateLabel = world
    ? `Year ${world.calendar?.year ?? world.year} · Week ${world.calendar?.currentWeek ?? world.week}`
    : "Initializing...";

  const phaseLabel = world?.cyclePhase === "active_basho"
    ? `Day ${bashoDay ?? 1} (Tournament)`
    : world?.cyclePhase === "pre_basho"
      ? "Pre-Basho Prep"
      : world?.cyclePhase === "post_basho"
        ? "Post-Basho Review"
        : "Interim Training";

  const handleContinue = () => {
    if (!world) return;
    advanceOneDay();
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 border-b border-border/50 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-4">
      {/* Left section: Sidebar trigger + Global Context */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
        </div>

        <div className="flex items-center gap-8 hidden lg:flex">
          {/* Calendar Context */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{dateLabel}</span>
            </div>
            <span className="text-sm font-bold leading-tight">{phaseLabel}</span>
          </div>

          {/* Economic Context */}
          {playerHeya && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col cursor-help">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Stable Funds</span>
                  </div>
                  <span className={`text-sm font-bold leading-tight ${playerHeya.funds < 0 ? "text-destructive" : "text-foreground"}`}>
                    ¥{playerHeya.funds.toLocaleString()}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Current balance for {playerHeya.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tighter">
                  Runway: {playerHeya.runwayBand}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* JSA Status Context */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">JSA Standing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold leading-tight">Elite Stability</span>
              <Badge variant="outline" className="h-4 text-[9px] uppercase tracking-tighter px-1">Meta: Oshi</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Right section: System controls + Primary Action */}
      <div className="flex items-center gap-3">
        {/* Autosave & System stuff */}
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
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate({ to: "/settings" as any })}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* The "Big Green Button" */}
        {world && (
          <Button
            size="lg"
            className={`
              h-10 px-6 gap-2 font-bold shadow-lg shadow-primary/20 
              transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
              ${inBasho ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"}
            `}
            onClick={handleContinue}
          >
            <span>{inBasho ? "Advance Day" : "Continue"}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
