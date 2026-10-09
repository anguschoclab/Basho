/**
 * TopNavBar.tsx
 *
 * Top navigation bar — composition shell. Sections live in
 * ./TopNavBarSections.tsx (context cluster, controls, advance
 * button, progress rail).
 */

import { useGame } from "@/contexts/useGame";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  ContextCluster,
  NavControls,
  AdvanceButton,
  BashoProgressRail,
} from "./TopNavBarSections";

export function TopNavBar() {
  const { state } = useGame();
  const world = state.world;
  const inBasho = world?.cyclePhase === "active_basho";
  const bashoDay = world?.currentBasho?.day ?? 1;

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
        <ContextCluster world={world} />

        {/* Spacer on mobile */}
        <div className="flex-1 lg:hidden" />

        {/* ─ Right Controls ─ */}
        <div className="flex items-center gap-1.5">
          <NavControls world={world} inBasho={inBasho} />

          {/* Thin separator before the Continue button */}
          <div className="w-px h-5 mx-1" style={{ background: "hsl(var(--border))" }} />

          {/* ─ SMART ADVANCE BUTTON — The hero action ─ */}
          {world && <AdvanceButton world={world} />}
        </div>
      </div>

      {/* ─ Basho Progress Rail ─ */}
      {inBasho && <BashoProgressRail day={bashoDay} />}
    </header>
  );
}
