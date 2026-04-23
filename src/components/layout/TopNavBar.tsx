import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { SaveLoadDialog } from "@/components/game/SaveLoadDialog";
import { useAutosaveIndicator } from "@/hooks/useAutosaveIndicator";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { Sun, Moon, ChevronRight, Settings } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { SidebarTrigger } from "@/components/ui/sidebar";

const RUNWAY_COLORS: Record<string, string> = {
  secure: "hsl(var(--success))",
  comfortable: "hsl(145 55% 48%)",
  tight: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  desperate: "hsl(var(--destructive))",
};

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  active_basho: { label: "Tournament", color: "hsl(var(--gold))" },
  pre_basho: { label: "Pre-Basho", color: "hsl(var(--west))" },
  post_basho: { label: "Post-Basho", color: "hsl(var(--success))" },
  interim: { label: "Interim", color: "hsl(var(--muted-foreground))" },
  banzuke_reveal: { label: "Banzuke", color: "hsl(var(--primary))" },
};

export function TopNavBar() {
  const { state, advanceOneDay } = useGame();
  const { setTheme, resolvedTheme } = useTheme();
  const autosaveStatus = useAutosaveIndicator();
  const navigate = useNavigate();
  const world = state.world;

  const playerHeya = world?.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;
  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day ?? 1;
  const cyclePhase = world?.cyclePhase ?? "interim";
  const phaseMeta = PHASE_LABELS[cyclePhase] ?? PHASE_LABELS.interim;

  const yearLabel = world ? `Year ${world.year}` : "—";
  const weekLabel = world ? `Wk ${world.calendar?.currentWeek ?? world.week}` : "—";

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{
        borderColor: "hsl(var(--border))",
        background: "hsl(var(--card))",
        /* Subtle top accent line — championship gold */
        boxShadow: `inset 0 1px 0 hsl(var(--gold) / 0.15), 0 1px 0 hsl(var(--border))`,
      }}
    >
      <div className="h-12 flex items-center px-3 gap-2">
        {/* Sidebar toggle */}
        <TooltipWrap content="Toggle navigation" side="right">
          <SidebarTrigger className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors" />
        </TooltipWrap>

        {/* Thin separator */}
        <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border))" }} />

        {/* ─ Context Info: Date + Phase ─ */}
        <div className="hidden lg:flex items-center gap-4 flex-1">
          {/* Date block */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <span
                className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
              >
                Date
              </span>
              <span
                className="text-[12px] font-semibold text-[hsl(var(--foreground)/0.85)] leading-tight tabular-nums"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {yearLabel} · {weekLabel}
              </span>
            </div>
          </div>

          {/* Phase block */}
          <div
            className="h-7 px-2.5 rounded flex items-center gap-2"
            style={{
              background: `${phaseMeta.color}18`,
              border: `1px solid ${phaseMeta.color}35`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: phaseMeta.color,
                boxShadow: `0 0 5px ${phaseMeta.color}`,
              }}
            />
            <span
              className="text-[11px] font-semibold leading-none"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
                color: phaseMeta.color,
              }}
            >
              {inBasho ? `Day ${bashoDay}` : phaseMeta.label}
            </span>
          </div>

          {/* Funds block */}
          {playerHeya && (
            <TooltipWrap
              content={
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{formatYen(playerHeya.funds)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Runway · {playerHeya.runwayBand}
                  </p>
                </div>
              }
              side="bottom"
            >
              <div className="flex flex-col cursor-help">
                <span
                  className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
                >
                  Funds
                </span>
                <span
                  className="text-[12px] font-semibold leading-tight tabular-nums"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color:
                      playerHeya.funds < 0
                        ? "hsl(var(--destructive))"
                        : (RUNWAY_COLORS[playerHeya.runwayBand ?? ""] ?? "hsl(var(--foreground))"),
                  }}
                >
                  {playerHeya.funds >= 0
                    ? formatYen(playerHeya.funds)
                    : `-${formatYen(Math.abs(playerHeya.funds))}`}
                </span>
              </div>
            </TooltipWrap>
          )}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 lg:hidden" />

        {/* ─ Right Controls ─ */}
        <div className="flex items-center gap-1.5">
          {/* Autosave indicator */}
          {world && autosaveStatus !== "idle" && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  autosaveStatus === "saving" ? "hsl(var(--primary))" : "hsl(var(--success))",
                animation: autosaveStatus === "saving" ? "pulse 1s ease-in-out infinite" : "none",
              }}
            />
          )}

          <SaveLoadDialog />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            tooltip={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            tooltipSide="bottom"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            onClick={() => navigate({ to: "/settings" })}
            aria-label="Settings"
            tooltip="Settings"
            tooltipSide="bottom"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>

          {/* Thin separator before the Continue button */}
          <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border))" }} />

          {/* ─ CONTINUE BUTTON — The hero action ─ */}
          {world && (
            <TooltipWrap
              content={
                inBasho ? "Advance to next day of tournament" : "Advance the simulation one day"
              }
              side="left"
            >
              <Button asChild variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <button
                  onClick={() => advanceOneDay()}
                  className="relative h-8 px-4 rounded flex items-center gap-2 font-semibold text-[12px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] overflow-hidden group"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    background: inBasho
                      ? "linear-gradient(135deg, hsl(var(--east)) 0%, hsl(44 78% 46%) 100%)"
                      : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(44 68% 40%) 100%)",
                    color: "hsl(222 32% 5%)",
                    boxShadow: inBasho
                      ? "0 2px 12px hsl(var(--east) / 0.3), inset 0 1px 0 hsl(38 80% 80% / 0.3)"
                      : "0 2px 12px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(38 80% 80% / 0.3)",
                  }}
                >
                  {/* Shimmer sweep on hover */}
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, hsl(38 80% 80% / 0.2) 50%, transparent 100%)",
                      transform: "skewX(-20deg)",
                    }}
                  />
                  <span className="relative hidden sm:inline">
                    {inBasho ? `Day ${bashoDay}` : "Continue"}
                  </span>
                  <ChevronRight className="relative h-3.5 w-3.5" />
                </button>
              </Button>
            </TooltipWrap>
          )}
        </div>
      </div>

      {/* ─ Basho Progress Rail ─ */}
      {inBasho && (
        <div className="h-0.5 w-full" style={{ background: "hsl(var(--border))" }}>
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${(bashoDay / 15) * 100}%`,
              background: "linear-gradient(to right, hsl(var(--east)), hsl(var(--gold)))",
              boxShadow: "0 0 4px hsl(var(--gold) / 0.5)",
            }}
          />
        </div>
      )}
    </header>
  );
}
