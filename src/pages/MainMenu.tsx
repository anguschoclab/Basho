/**
 * MainMenu.tsx
 *
 * Unified Main Entry & Stable Selection Flow.
 * Composition shell — hero/seed/selection sections live in
 * ../components/menu/MainMenuSections.tsx and state in
 * ../hooks/useMainMenuState.ts.
 */

import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { HeyaPreview } from "@/components/menu/HeyaPreview";
import { MainMenuSelectedFooter } from "@/components/menu/MainMenuSelectedFooter";
import { MainMenuFooter } from "@/components/menu/MainMenuFooter";
import {
  MainMenuHero,
  SeedInputRow,
  StableSelectionTabs,
} from "@/components/menu/MainMenuSections";
import { projectHeyaRosterWithAge } from "@/presenters/uiDigest";
import { useMainMenuState } from "@/hooks/useMainMenuState";

export default function MainMenu() {
  const navigate = useNavigate();
  const game = useGame();
  const state = useMainMenuState();

  const beginWithHeya = (heyaId: string) => {
    navigate({ to: "/new-game", search: { heyaId } });
  };

  if (!state.world) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-arena-ground">
        <div className="h-2 w-48 bg-muted rounded-xs overflow-hidden mb-6">
          <div className="h-full bg-primary animate-progress-flow" />
        </div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-gold/60">
          Institutional Interface Initializing...
        </p>
      </div>
    );
  }

  return (
    <>
      <title>BASHO — Sumo Management Simulator</title>

      <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
        <MainMenuHero game={game} />

        <main className="max-w-6xl w-full px-6 -mt-10 relative z-20 pb-24">
          {state.showSeedInput && <SeedInputRow state={state} />}

          <StableSelectionTabs state={state} />

          <MainMenuSelectedFooter
            selectedHeyaId={state.selectedHeyaId}
            stables={state.stables}
            onBegin={beginWithHeya}
          />
        </main>

        <HeyaPreview
          heya={state.previewHeya}
          onClose={() => state.setPreviewHeya(null)}
          onConfirm={beginWithHeya}
          sekitoriCount={
            state.previewHeya ? (state.sekitoriCounts.get(state.previewHeya.id) ?? 0) : 0
          }
          rosterWithAge={
            state.previewHeya && state.world
              ? projectHeyaRosterWithAge(state.world, state.previewHeya.id)
              : []
          }
        />

        <MainMenuFooter
          seed={state.seed}
          worldSeed={state.world?.seed}
          showSeedInput={state.showSeedInput}
          onToggleSeedInput={() => state.setShowSeedInput(!state.showSeedInput)}
          onReroll={state.handleRerollWorld}
        />
      </div>
    </>
  );
}
