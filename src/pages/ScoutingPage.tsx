import { OpponentScoutingTab } from "@/components/scouting/OpponentScoutingTab";
import { StableIntelTab } from "@/components/scouting/StableIntelTab";
import { RecruitingTab } from "@/components/scouting/RecruitingTab";
// ScoutingPage.tsx
// Dedicated Scouting & Recruitment page per Basho Constitution A8/System 4
// Between-basho player actions: scout opponents, evaluate prospects, invest in intel

import { useMemo, useState } from "react";
import { RecruitSigningDialog } from "@/components/game/RecruitSigningDialog";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Eye,
  UserPlus,
  Target,
  Binoculars,
  Globe,
  GraduationCap,
  School,
  ChevronRight,
  Shield,
} from "lucide-react";
import type { ScoutingInvestment } from "@/engine/scouting";
import {
  RANK_NAMES,
  STYLE_NAMES,
  ARCHETYPE_NAMES,
  describeScoutingLevel,
  getScoutedAttributes,
} from "@/engine/scouting";
import {
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
} from "@/engine/scoutingStore";
import * as talentpool from "@/engine/systems/generation/TalentPoolService";
import { RikishiName } from "@/components/ClickableName";
import { useToast } from "@/hooks/use-toast";
import { PerceptionOverview } from "@/components/game/PerceptionOverview";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TacticalArchetype } from "@/engine/types/combat";
import type { WorldState } from "@/engine/types/world";
import { projectRikishi, type UIRikishi } from "@/presenters/uiModels";
import { RANK_HIERARCHY } from "@/engine/banzuke";

export default function ScoutingPage() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId =
    state.playerHeyaId ?? (world as any)?.playerHeyaId ?? null;

  if (!world) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No world loaded.
      </div>
    );
  }

  return (
    <AppLayout
      pageTitle="Scouting Network"
      subNavTabs={OFFICE_TABS}
      activeSubTab="scouting"
    >
      <Helmet>
        <title>Scouting & Recruitment — Basho</title>
        <meta
          name="description"
          content="Scout opponents, evaluate prospects, and build your roster in Basho sumo management simulation."
        />
      </Helmet>

      <div className="space-y-6">
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
            <OpponentScoutingTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="stable">
            <StableIntelTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="perception">
            <PerceptionOverview world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="recruit">
            <RecruitingTab world={world} playerHeyaId={playerHeyaId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
