import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Landmark } from "lucide-react";
import { getStatusLabel } from "@/presenters/uiDigest";
import { useGovernanceDerived } from "@/hooks/useGovernanceDerived.tsx";
import { GovernanceOverviewTab } from "@/components/governance/GovernanceOverviewTab";
import { GovernanceRulingsTab } from "@/components/governance/GovernanceRulingsTab";
import { GovernancePoliticsTab } from "@/components/governance/GovernancePoliticsTab";

export default function GovernancePage() {
  const { state } = useGame();
  const world = state.world;

  const { heya, closedHeyas, yokozunaVacancyStreak, derived, resolvedRulingIds } =
    useGovernanceDerived(world);

  if (!world || !heya || !derived) {
    return (
      <AppLayout
        pageTitle="Governance & Compliance"
        subNavTabs={ASSOCIATION_TABS}
        activeSubTab="governance"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Governance"
            description="Fetching association records..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

  const { status } = derived;

  return (
    <AppLayout
      pageTitle="Governance & Compliance"
      subNavTabs={ASSOCIATION_TABS}
      activeSubTab="governance"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="Governance & Compliance"
          lede={`Official records of the Sumo Association regarding ${heya.name}.`}
          actions={
            <Badge
              variant={status === "good_standing" ? "outline" : "destructive"}
              className="text-sm px-3 py-1"
            >
              <Scale className="mr-2 h-4 w-4" />
              {getStatusLabel(world, status)}
            </Badge>
          }
        />

        {(closedHeyas.length > 0 || yokozunaVacancyStreak > 0) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {closedHeyas.length > 0 && <span>{closedHeyas.length} stable(s) closed</span>}
            {yokozunaVacancyStreak > 0 && (
              <span>Yokozuna vacancy: {yokozunaVacancyStreak} basho</span>
            )}
          </div>
        )}

        <Tabs
          defaultValue={derived.pendingRulings.length > 0 ? "rulings" : "overview"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[520px] mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rulings" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Rulings
              {derived.pendingRulings.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[9px]">
                  {derived.pendingRulings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="politics" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Politics
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ──────────────────────────────────────────────── */}
          <GovernanceOverviewTab world={world} heya={heya} derived={derived} />

          {/* ── Rulings ───────────────────────────────────────────────── */}
          <GovernanceRulingsTab derived={derived} resolvedRulingIds={resolvedRulingIds} />

          {/* ── Politics ──────────────────────────────────────────────── */}
          <GovernancePoliticsTab world={world} heya={heya} derived={derived} />
        </Tabs>
      </div>
    </AppLayout>
  );
}
