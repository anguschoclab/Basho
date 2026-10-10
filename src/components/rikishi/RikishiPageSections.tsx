/**
 * RikishiPageSections.tsx
 *
 * View branches of RikishiPage — roster list view, not-found state, and
 * the individual profile body (tabs, admin actions, intai ceremony).
 */

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { RosterList } from "@/components/rikishi/RosterList";
import { RikishiProfileHeader } from "@/components/rikishi/RikishiProfileHeader";
import { RikishiLineage } from "@/components/rikishi/RikishiLineage";
import { RikishiNaturalization } from "@/components/rikishi/RikishiNaturalization";
import { RikishiProfileTab } from "@/components/rikishi/RikishiProfileTab";
import { RikishiCombatTab } from "@/components/rikishi/RikishiCombatTab";
import { RikishiCareerTab } from "@/components/rikishi/RikishiCareerTab";
import { RikishiKeshoMawashi } from "@/components/rikishi/RikishiKeshoMawashi";
import { RikishiGlobalCup } from "@/components/rikishi/RikishiGlobalCup";
import { IntaiCeremony } from "@/components/game/IntaiCeremony";
import { getHeya } from "@/presenters/worldAccess";
import { Trash2 } from "lucide-react";
import type { WorldState } from "@/presenters/uiDigest";
import type { UIRikishi } from "@/presenters/rikishi";
import type { Rikishi as RawRikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot, Milestone } from "@/engine/types/history";
import type {
  useCareerProgressionData,
  useEarningsProgressionData,
} from "@/components/rikishi/useRikishiData";
import type { getHealthBadge } from "@/presenters/PerceptionPresenter";

/** Stable roster list view — shown when no rikishiId is in the route. */
export function RosterListView({
  rikishiList,
  onRikishiClick,
}: {
  rikishiList: UIRikishi[];
  onRikishiClick: (id: string) => void;
}) {
  return (
    <AppLayout pageTitle="Roster Management" subNavTabs={STABLE_TABS} activeSubTab="roster">
      <title>Roster Management | Basho</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title="Roster Management"
          lede="Manage your stable's wrestlers, view profiles, and track development."
        />
        <RosterList rikishiList={rikishiList} onRikishiClick={onRikishiClick} />
      </div>
    </AppLayout>
  );
}

/** Not-found state for an unknown rikishiId. */
export function RikishiNotFound({ onBack }: { onBack: () => void }) {
  return (
    <AppLayout pageTitle="Rikishi Not Found">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground font-display italic">
          The requested rikishi does not exist in the Association records.
        </p>
        <Button variant="outline" onClick={onBack}>
          Return to Roster
        </Button>
      </div>
    </AppLayout>
  );
}

const TAB_TRIGGER_CLASS =
  "bg-transparent px-0 pb-2 rounded-none font-mono font-bold uppercase tracking-[0.15em] text-[10px] data-[state=active]:bg-transparent data-[state=active]:text-gold data-[state=active]:border-b-2 data-[state=active]:border-gold transition-all";

/** Individual rikishi profile body — header, tabs, admin actions, ceremony. */
export function RikishiProfileBody({
  rikishi,
  rawRikishi,
  world,
  playerHeyaId,
  activeTab,
  onTabChange,
  showIntaiCeremony,
  onShowIntaiCeremony,
  onBack,
  onFinalizeRetirement,
  careerProgressionData,
  earningsProgressionData,
  healthBadge,
  mentor,
  mentees,
}: {
  rikishi: UIRikishi;
  rawRikishi: RawRikishi;
  world: WorldState;
  playerHeyaId: string | null | undefined;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showIntaiCeremony: boolean;
  onShowIntaiCeremony: (show: boolean) => void;
  onBack: () => void;
  onFinalizeRetirement: () => void;
  careerProgressionData: ReturnType<typeof useCareerProgressionData>;
  earningsProgressionData: ReturnType<typeof useEarningsProgressionData>;
  healthBadge: ReturnType<typeof getHealthBadge>;
  mentor: RawRikishi | null;
  mentees: RawRikishi[];
}) {
  const isOwned = rikishi.heyaId === playerHeyaId;
  const history = rikishi.careerHistory;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <RikishiProfileHeader
        rikishi={rikishi}
        isOwned={isOwned}
        healthBadge={healthBadge}
        isKadoban={rikishi.rank === "ozeki" && !!world.ozekiKadoban?.[rikishi.id]?.isKadoban}
        onBack={onBack}
      />

      <div className="p-8">
        <RikishiLineage mentor={mentor} mentees={mentees} rikishiId={rikishi.id} />
        <RikishiKeshoMawashi rikishi={rikishi} />
        <RikishiNaturalization rikishi={rikishi} />

        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-8">
          <TabsList className="bg-transparent h-10 p-0 gap-8 rounded-none border-b border-border/40 w-full justify-start">
            <TabsTrigger value="profile" className={TAB_TRIGGER_CLASS}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="combat" className={TAB_TRIGGER_CLASS}>
              Combat
            </TabsTrigger>
            <TabsTrigger value="history" className={TAB_TRIGGER_CLASS}>
              Career Archives
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="profile"
            className="space-y-8 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <RikishiProfileTab
              rikishi={rikishi}
              rawRikishi={rawRikishi}
              worldSeed={world.seed}
              world={world}
            />
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
              milestones={rikishi.milestones as Milestone[]}
              careerProgressionData={careerProgressionData}
              notableBouts={undefined}
              narrativeHighlights={undefined}
              promotionHistory={undefined}
              earningsProgressionData={earningsProgressionData}
              economics={{
                totalEarnings: rikishi.totalEarnings,
                cash: rikishi.cash,
                retirementFund: rikishi.retirementFund,
                careerKenshoWon: rikishi.careerKenshoWon,
                kinboshiCount: rikishi.kinboshiCount,
                popularity: rikishi.popularity,
                currentBashoEarnings: rikishi.currentBashoEarnings,
              }}
            />
            <RikishiGlobalCup rikishiId={rikishi.id} world={world} />
          </TabsContent>
        </Tabs>
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
            onClick={() => onShowIntaiCeremony(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Declare Retirement
          </Button>
        </div>
      </div>

      <IntaiCeremony
        rikishi={rikishi}
        reason="Personal decision of the Stable Master (Player)"
        heyaName={getHeya(world, rikishi.heyaId)?.name || "Unknown"}
        isPlayerRikishi={true}
        open={showIntaiCeremony}
        onClose={onFinalizeRetirement}
      />
    </div>
  );
}
