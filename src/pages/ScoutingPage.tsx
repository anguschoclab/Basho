// ScoutingPage.tsx — Dedicated Scouting & Recruitment page
// Decoupled from engine state per Architectural Boundary Enforcement

import { OpponentScoutingTab } from "@/components/scouting/OpponentScoutingTab";
import { MyStableTab } from "@/components/scouting/MyStableTab";
import { RecruitingTab } from "@/components/scouting/RecruitingTab";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/state/game/useGame";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Eye, UserPlus, Shield } from "lucide-react";
import { PageHeader } from "@/components/layout/page-shell/index";
import { FirstVisitHint } from "@/components/onboarding/FirstVisitHint";
import { PerceptionOverview } from "@/components/scouting/PerceptionOverview";
import { useGameStore } from "@/state/stores/gameStore";
import { toast } from "sonner";
import { SCOUT_TIERS, type ScoutMissionTier } from "@/presenters/engineAccess";
import { Plane } from "lucide-react";

export default function ScoutingPage() {
  const { state } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const world = state.world;
  const playerHeyaId = state.playerHeyaId ?? world?.playerHeyaId ?? null;
  const heya = playerHeyaId ? world?.heyas.get(playerHeyaId) : undefined;
  const scouts = (heya?.staffIds ?? [])
    .map((id) => world?.staff.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && s.role === "scout");
  const missions = world?.activeScoutMissions ?? [];
  const currentWeek = world?.week ?? 0;

  if (!world) {
    return (
      <AppLayout pageTitle="Scouting Network" subNavTabs={OFFICE_TABS} activeSubTab="scouting">
        <div className="p-6 text-center text-muted-foreground">No world loaded.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Scouting Network" subNavTabs={OFFICE_TABS} activeSubTab="scouting">
      <title>Scouting & Recruitment — Basho</title>
      <meta
        name="description"
        content="Scout opponents, evaluate prospects, and build your roster in Basho sumo management simulation."
      />

      <div className="space-y-6">
        <PageHeader
          eyebrow="OFFICE"
          title="Scouting Network"
          lede="Scout opponents, evaluate prospects, and build your roster."
        />

        {/* P4 — mission-based scouting */}
        {heya && (
          <section className="rounded-md border border-[hsl(var(--border))] p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Scout Missions
            </h2>
            {missions.length > 0 && (
              <ul className="text-xs space-y-1">
                {missions.map((m) => {
                  const scout = world?.staff.get(m.scoutStaffId);
                  return (
                    <li key={m.id} className="text-[hsl(var(--foreground)/0.85)]">
                      <Plane className="inline h-3 w-3 mr-1" />
                      {scout?.name ?? "Scout"} — {m.tier} — returns week {m.returnsWeek} (
                      {Math.max(0, m.returnsWeek - currentWeek)} wk remaining)
                    </li>
                  );
                })}
              </ul>
            )}
            {scouts.length === 0 ? (
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Hire a scout on the Staff page to dispatch field missions.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCOUT_TIERS) as ScoutMissionTier[]).map((tier) => {
                  const def = SCOUT_TIERS[tier];
                  const scout = scouts[0];
                  const busy = missions.some((m) => m.scoutStaffId === scout.id);
                  const affordable = (heya.funds ?? 0) >= def.costYen;
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={busy || !affordable}
                      onClick={() => {
                        sendCommand({ type: "SEND_SCOUT", heyaId: heya.id, scoutStaffId: scout.id, tier });
                        toast.success(`${scout.name} dispatched — ${tier}`);
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded border border-[hsl(var(--border))] disabled:opacity-40"
                      title={`${def.durationWeeks} weeks · targets ${def.pool}`}
                    >
                      {tier} · ¥{def.costYen.toLocaleString("en-US")} · {def.durationWeeks}wk
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

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
              Perception
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
            <MyStableTab playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="perception">
            <PerceptionOverview playerHeyaId={playerHeyaId} />
          </TabsContent>

          <TabsContent value="recruit">
            <RecruitingTab playerHeyaId={playerHeyaId} />
          </TabsContent>
        </Tabs>
      </div>
      <FirstVisitHint hintId="scouting" />
    </AppLayout>
  );
}
