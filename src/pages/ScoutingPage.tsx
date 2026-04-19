// ScoutingPage.tsx — Dedicated Scouting & Recruitment page
// Decoupled from engine state per Architectural Boundary Enforcement

import { OpponentScoutingTab } from "@/components/scouting/OpponentScoutingTab";
import { StableIntelTab } from "@/components/scouting/StableIntelTab";
import { RecruitingTab } from "@/components/scouting/RecruitingTab";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Eye, UserPlus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";
import { PerceptionOverview } from "@/components/game/PerceptionOverview";

export default function ScoutingPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId ?? world?.playerHeyaId ?? null;

  if (!world) {
    return (
      <AppLayout pageTitle="Scouting Network" subNavTabs={OFFICE_TABS} activeSubTab="scouting">
        <div className="p-6 text-center text-muted-foreground">No world loaded.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Scouting Network" subNavTabs={OFFICE_TABS} activeSubTab="scouting">
      <Helmet>
        <title>Scouting & Recruitment — Basho</title>
        <meta
          name="description"
          content="Scout opponents, evaluate prospects, and build your roster in Basho sumo management simulation."
        />
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── OFFICE ──"
          title="Scouting Network"
          lede="Scout opponents, evaluate prospects, and build your roster."
        />
        <Tabs defaultValue="opponents" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="opponents" className="gap-2">
              <Target className="h-4 w-4" />
              Opponents
            </TabsTrigger>
            <TabsTrigger value="stable" className="gap-2">
              <Shield className="h-4 w-4" />
              My Stable
            </TabsTrigger>
            <TabsTrigger value="perception" className="gap-2">
              <Eye className="h-4 w-4" />
              Intel
            </TabsTrigger>
            <TabsTrigger value="recruit" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Recruit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opponents">
            <OpponentScoutingTab playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="stable">
            <StableIntelTab playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="perception">
            <PerceptionOverview playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="recruit">
            <RecruitingTab playerHeyaId={playerHeyaId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
