/**
 * GlobalCupPage.tsx
 * =================
 * Main tournament page for the Global Cup (Worlds Exhibition).
 */

import { AppLayout } from "@/components/layout/AppLayout";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { Trophy } from "lucide-react";
import { projectGlobalCup } from "@/presenters/projections/globalCupProjections";
import {
  CupHero,
  CupStatsBar,
  CupStatsSection,
  CupParticipantsGrid,
  CupEventFeed,
  CupBracketSection,
  CupChampionBanner,
} from "@/components/game/GlobalCupSections";

export default function GlobalCupPage() {
  const { state } = useGame();
  const world = state.world;
  const cup = world?.globalCup;

  if (!cup || !cup.isActive) {
    return (
      <AppLayout pageTitle="Global Cup" subNavTabs={TOURNAMENT_TABS} activeSubTab="global-cup">
        <title>Global Cup | Basho</title>

        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
          <Trophy className="h-16 w-16 text-gold/50" />
          <h1 className="text-3xl font-display font-bold">世界大相撲</h1>
          <p className="text-xl text-muted-foreground">Worlds Exhibition</p>
          <p className="text-sm text-muted-foreground max-w-md">
            The Global Cup will be held during interim weeks 10-11 each year. The top 6 JSA rikishi
            face 2 international challengers in a single elimination tournament.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Build rikishi name map
  const rikishiNames = new Map<string, string>();
  cup.participants.forEach((p: { rikishiId: string; shikona: string }) => {
    rikishiNames.set(p.rikishiId, p.shikona);
  });

  // Get projection for data visualization
  const projection = projectGlobalCup(world);

  return (
    <AppLayout pageTitle="Global Cup">
      <title>Global Cup | Basho</title>

      <div className="space-y-8">
        <CupHero cup={cup} />
        <CupStatsBar cup={cup} />
        <CupStatsSection projection={projection} />
        <CupParticipantsGrid cup={cup} />
        <CupEventFeed />
        <CupBracketSection cup={cup} rikishiNames={rikishiNames} />
        <CupChampionBanner cup={cup} rikishiNames={rikishiNames} />
      </div>
    </AppLayout>
  );
}
