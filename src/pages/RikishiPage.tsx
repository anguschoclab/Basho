/**
 * RikishiPage.tsx
 *
 * Individual Profile and Stable Roster Management.
 * Features a "Rich Aesthetics" Dossier design for rikishi profiles.
 * Architecturally decomposed to use RosterList for list views.
 */

import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { useRequireWorld } from "@/components/RequireWorld";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { STABLE_TABS } from "@/constants/ui/navigation";
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
import { RikishiGlobalCup } from "@/components/rikishi/RikishiGlobalCup";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { Trash2 } from "lucide-react";
import { retireRikishiImpact } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { EntityCollection } from "@/engine/core/EntityCollection";

export default function RikishiPage() {
  const { rikishiId } = useParams({ strict: false });
  const { state, updateWorld } = useGame();
  const { world, playerHeyaId } = state;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [showIntaiCeremony, setShowIntaiCeremony] = useState(false);

  // Prepare data for roster list view (before any early returns)
  const effectiveHeyaId = playerHeyaId || world?.playerHeyaId;
  const rikishiList = useMemo(() => {
    if (!world || rikishiId) return [];
    if (!effectiveHeyaId) return [];
    return EntityCollection.getHeyaRoster(world, effectiveHeyaId).map((r) =>
      projectRikishi(r, world)
    );
  }, [world, effectiveHeyaId, rikishiId]);

  // Get raw rikishi data safely
  const rawRikishi = world?.rikishi.get(rikishiId || "");
  const rikishi = rawRikishi && world ? projectRikishi(rawRikishi, world) : null;
  const history = rikishi?.careerHistory;

  // Prepare data using custom hooks
  const careerProgressionData = useCareerProgressionData(history as CareerSnapshot[] | undefined);

  const hasWorld = useRequireWorld();
  if (!hasWorld || !world) return null;

  // ── Roster List View ────────────────────────────────
  if (!rikishiId) {
    return (
      <AppLayout pageTitle="Roster Management" subNavTabs={STABLE_TABS} activeSubTab="roster">
        <Helmet>
          <title>Roster Management | Basho</title>
        </Helmet>
        <div className="space-y-6">
          <PageHeader
            eyebrow="── MY STABLE ──"
            title="Roster Management"
            lede="Manage your stable's wrestlers, view profiles, and track development."
          />
          <RosterList
            rikishiList={rikishiList}
            onRikishiClick={(id) =>
              navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: id } })
            }
          />
        </div>
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
  const mentor = getMentor(world, rawRikishi) ?? null;
  const mentees = menteesOf(world, rawRikishi);
  const lineageTree = getLineageTree(world, rawRikishi.id);

  const finalizeRetirement = () => {
    // Stage 2: Actually apply retirement to the world
    const impact = retireRikishiImpact(rikishi.id, "player_initiated_intai");
    updateWorld(resolveImpacts(world, [impact]));
    setShowIntaiCeremony(false);
    // Navigate back to roster
    navigate({ to: "/stable/roster" });
  };

  return (
    <AppLayout
      pageTitle="Rikishi Profile"
      subNavTabs={STABLE_TABS}
      activeSubTab="roster"
      breadcrumbItems={[
        { label: "Home", href: "/dashboard" },
        { label: "Roster", href: "/stable/roster" },
        { label: rikishi.shikona, href: `/rikishi/${rikishiId}`, isCurrent: true },
      ]}
    >
      <Helmet>
        <title>{rikishi.shikona} — Official Association Profile | Basho</title>
      </Helmet>

      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <RikishiProfileHeader
          rikishi={rikishi}
          isOwned={isOwned}
          healthBadge={healthBadge}
          isKadoban={rikishi.rank === "ozeki" && !!world.ozekiKadoban?.[rikishi.id]?.isKadoban}
          onBack={() => navigate({ to: "/stable/roster" })}
        />

        <div className="p-8">
          <RikishiLineage
            mentor={mentor}
            mentees={mentees}
            lineageTree={lineageTree}
            rikishiId={rikishi.id}
          />
          <RikishiKeshoMawashi rikishi={rikishi} />
          <RikishiNaturalization rikishi={rikishi} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-transparent h-10 p-0 gap-8 rounded-none border-b border-border/40 w-full justify-start">
              <TabsTrigger
                value="profile"
                className="bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[10px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="combat"
                className="bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[10px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all"
              >
                Combat
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[10px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all"
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
              <RikishiCombatTab rikishi={rikishi} rawRikishi={rawRikishi} isOwned={isOwned} />
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
              <RikishiGlobalCup rikishiId={rikishi.id} world={world} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-destructive/20">
        <div className="flex items-center justify-between p-4 rounded bg-destructive/5 border border-destructive/10">
          <div>
            <h4 className="font-display font-bold text-destructive uppercase tracking-tight">
              Administrative Actions
            </h4>
            <p className="text-[11px] text-muted-foreground font-body">
              Declare retirement (intai) for this rikishi.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setShowIntaiCeremony(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Declare Retirement
          </Button>
        </div>
      </div>

      <IntaiCeremony
        rikishi={rikishi}
        reason="Personal decision of the Stable Master (Player)"
        heyaName={world.heyas.get(rikishi.heyaId)?.name || "Unknown"}
        isPlayerRikishi={true}
        open={showIntaiCeremony}
        onClose={finalizeRetirement}
      />
    </AppLayout>
  );
}
