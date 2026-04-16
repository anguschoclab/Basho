/**
 * RikishiPage.tsx
 *
 * Individual Profile and Stable Roster Management.
 * Features a "Rich Aesthetics" Dossier design for rikishi profiles.
 * Architecturally decomposed to use RosterList for list views.
 */

import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { HQ_TABS } from "@/constants/navigation";
import { projectRikishi } from "@/presenters/uiModels";
import { RosterList } from "@/components/rikishi/RosterList";
import { getMentor, menteesOf, getLineageTree } from "@/engine/lineage";
import { getHealthBadge } from "@/presenters/PerceptionPresenter";
import type { CareerSnapshot, Milestone } from "@/engine/types/history";
import { RikishiProfileHeader } from "@/components/rikishi/RikishiProfileHeader";
import { RikishiLineage } from "@/components/rikishi/RikishiLineage";
import { RikishiNaturalization } from "@/components/rikishi/RikishiNaturalization";
import { RikishiProfileTab } from "@/components/rikishi/RikishiProfileTab";
import { RikishiCombatTab } from "@/components/rikishi/RikishiCombatTab";
import { RikishiCareerTab } from "@/components/rikishi/RikishiCareerTab";
import { RikishiKeshoMawashi } from "@/components/rikishi/RikishiKeshoMawashi";
import { useCareerProgressionData } from "@/components/rikishi/useRikishiData";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  // Prepare data for roster list view (before any early returns)
  const rikishiList = useMemo(() => {
    if (!world || rikishiId) return [];
    return Array.from(world.rikishi.values())
      .filter((r) => r.heyaId === playerHeyaId)
      .map((r) => projectRikishi(r, world));
  }, [world, playerHeyaId, rikishiId]);

  // Get raw rikishi data safely
  const rawRikishi = world?.rikishi.get(rikishiId || "");
  const rikishi = rawRikishi && world ? projectRikishi(rawRikishi, world) : null;
  const history = rikishi?.careerHistory;

  // Prepare data using custom hooks
  const careerProgressionData = useCareerProgressionData(history);

  if (!world) return null;

  // ── Roster List View ────────────────────────────────
  if (!rikishiId) {
    return (
      <AppLayout pageTitle="Roster Management" subNavTabs={HQ_TABS} activeSubTab="roster">
        <Helmet>
          <title>Roster Management | Basho</title>
        </Helmet>
        <RosterList
          rikishiList={rikishiList}
          onRikishiClick={(id) =>
            navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: id } })
          }
        />
      </AppLayout>
    );
  }

  // ── Individual Profile View ─────────────────────────
  if (!rawRikishi || !rikishi)
    return (
      <AppLayout pageTitle="Rikishi Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground font-display italic">
            The requested rikishi does not exist in the Association records.
          </p>
          <Button variant="outline" onClick={() => navigate({ to: "/stable/roster" })}>
            Return to Roster
          </Button>
        </div>
      </AppLayout>
    );

  const isOwned = rikishi.heyaId === playerHeyaId;
  const milestones = rikishi.milestones;
  const healthBadge = getHealthBadge(rawRikishi);

  // Get mentorship info using lineage functions
  const mentor = getMentor(world, rawRikishi);
  const mentees = menteesOf(world, rawRikishi);
  const lineageTree = getLineageTree(world, rawRikishi.id);

  return (
    <AppLayout pageTitle="Rikishi Profile" subNavTabs={HQ_TABS} activeSubTab="roster">
      <Helmet>
        <title>{rikishi.shikona} — Official Association Profile | Basho</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <RikishiProfileHeader
          rikishi={rikishi}
          isOwned={isOwned}
          healthBadge={healthBadge}
          onBack={() => navigate({ to: "/stable/roster" })}
        />

        <div className="p-8">
          <RikishiLineage mentor={mentor} mentees={mentees} lineageTree={lineageTree} />
          <RikishiKeshoMawashi rikishi={rikishi} />
          <RikishiNaturalization rikishi={rikishi} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-muted/50 p-1 rounded-full border border-border/50 max-w-lg">
              <TabsTrigger
                value="profile"
                className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="combat"
                className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Combat
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-full px-8 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                Career Archives
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="profile"
              className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <RikishiProfileTab rikishi={rikishi} rawRikishi={rawRikishi} worldSeed={world.seed} />
            </TabsContent>

            <TabsContent
              value="combat"
              className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300"
            >
              <RikishiCombatTab rikishi={rikishi} rawRikishi={rawRikishi} />
            </TabsContent>

            <TabsContent
              value="history"
              className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300"
            >
              <RikishiCareerTab
                history={history as CareerSnapshot[]}
                milestones={milestones as Milestone[]}
                careerProgressionData={careerProgressionData}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
