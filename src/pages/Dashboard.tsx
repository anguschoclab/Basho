import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";

import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { BanzukeWidget } from "@/components/dashboard/BanzukeWidget";
import { StableWidget } from "@/components/dashboard/StableWidget";
import { RosterWidget } from "@/components/dashboard/RosterWidget";
import { FinancesWidget } from "@/components/dashboard/FinancesWidget";
import { BashoWidget } from "@/components/dashboard/BashoWidget";
import { NewsWidget } from "@/components/dashboard/NewsWidget";
import { RivalsWidget } from "@/components/dashboard/RivalsWidget";
import { ScoutingWidget } from "@/components/dashboard/ScoutingWidget";

export default function Dashboard() {
  const { state, hasAutosave, loadFromAutosave } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  const isLoaded = !!world;

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

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-4">
        {/* Portal header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-display text-lg font-bold">力</span>
          </div>
          <div>
            <h1 className="text-lg font-display font-bold leading-tight">
              {playerHeya?.name || "Stable"} — Oyakata Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              {world.year} · {world.currentBashoName?.charAt(0).toUpperCase()}{world.currentBashoName?.slice(1)} · Week {world.calendar?.currentWeek ?? world.week}
            </p>
          </div>
        </div>

        {/* FM-style modular grid */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {/* Column 1: Calendar + Stable + Finances */}
          <div className="space-y-4">
            <CalendarWidget />
            <StableWidget />
            <FinancesWidget />
          </div>

          {/* Column 2: Basho/Tournament + Banzuke */}
          <div className="space-y-4">
            <BashoWidget />
            <BanzukeWidget />
          </div>

          {/* Column 3: Roster + News + Rivals */}
          <div className="space-y-4">
            <RosterWidget />
            <NewsWidget />
            <RivalsWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
