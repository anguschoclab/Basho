import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { SponsorsPanel } from "@/components/game/SponsorsPanel";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { safeRunwayBand, safeKoenkaiBand } from "@/components/economy/economyUtils";
import { FinancialHealthOverview } from "@/components/economy/FinancialHealthOverview";
import { BailoutCard } from "@/components/economy/BailoutCard";
import { DebtSection } from "@/components/economy/DebtSection";
import { KoenkaiSekitoriCards } from "@/components/economy/KoenkaiSekitoriCards";
import { IncomeExpensesCards } from "@/components/economy/IncomeExpensesCards";
import { SponsorDrawCard } from "@/components/economy/SponsorDrawCard";
import { EconomyInfoNote } from "@/components/economy/EconomyInfoNote";
import { FinancialTrendsChart } from "@/components/economy/FinancialTrendsChart";
import { SortMenu } from "@/components/ui/SortMenu";
import type { SortDirection } from "@/lib/sortUtils";
import { useEconomyDerived } from "@/hooks/useEconomyDerived";

/** Loan type matching DebtSection component requirements. */
interface DebtLoan {
  id: string;
  type: string;
  providerName: string;
  amount: number;
  interestRate: number;
  dueWeek: number;
  remainingBalance: number;
  principal: number;
  monthlyPayment: number;
  stringsAttached?: string[];
}

const EARNER_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "kensho", label: "Kensho" },
];

/** economy page. */
export default function EconomyPage() {
  const { state } = useGame();
  const world = state.world;
  const [earnerSortKey, setEarnerSortKey] = useState<string>("kensho");
  const [earnerSortOrder, setEarnerSortOrder] = useState<SortDirection>("asc");

  const {
    sendCommand,
    playerHeya,
    handleBailoutRequest,
    sekitoriCount,
    topEarners,
    weeklyFinances,
  } = useEconomyDerived(world, state.playerHeyaId, earnerSortKey, earnerSortOrder);

  if (!world) {
    return (
      <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="economy" pageTitle="Financial Management">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Finances"
            description="Calculating financial health and projections..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

  if (!playerHeya) {
    return (
      <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="economy" pageTitle="Financial Management">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={AlertCircle}
            title="No Stable Selected"
            description="You must be managing a stable to view financial records."
          />
        </div>
      </AppLayout>
    );
  }

  const runwayBand = safeRunwayBand(playerHeya.runwayBand || "unknown");
  const koenkaiBand = safeKoenkaiBand(
    (playerHeya as typeof playerHeya & { koenkaiBand?: string }).koenkaiBand || "unknown"
  );

  const hasFinancialRisk = !!(
    playerHeya as typeof playerHeya & { riskIndicators?: { financial?: boolean } }
  )?.riskIndicators?.financial;
  const canRequestBailout = playerHeya.funds < 0;
  const institutionData = projectHeyaData(world, playerHeya.id);

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="economy" pageTitle="Financial Management">
      <title>Economy — {playerHeya.name} | Basho</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── OFFICE ──"
          title="Financial Management"
          lede="Treasury overview, sponsorships, and debt obligations."
        />
        {/* Financial Health Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <FinancialHealthOverview
            funds={playerHeya.funds}
            runwayBand={runwayBand}
            hasFinancialRisk={hasFinancialRisk}
          />
          <BailoutCard
            canRequestBailout={canRequestBailout}
            onBailoutRequest={handleBailoutRequest}
          />
        </div>

        {/* Debt & Obligations (FM v2.0) */}
        <DebtSection
          activeLoans={
            (playerHeya as typeof playerHeya & { activeLoans?: DebtLoan[] }).activeLoans ?? []
          }
          onPrepay={(loanId) => sendCommand({ type: "PREPAY_LOAN", heyaId: playerHeya.id, loanId })}
        />

        {/* Grid: Koenkai & Sekitori */}
        <KoenkaiSekitoriCards koenkaiBand={koenkaiBand} sekitoriCount={sekitoriCount} />

        <SponsorsPanel />

        {/* Institution Health */}
        {institutionData && (
          <InstitutionPanel
            heya={playerHeya}
            oyakata={institutionData.oyakata}
            oyakataQuirks={institutionData.oyakataQuirks}
            oyakataTraits={institutionData.oyakataTraits}
          />
        )}

        {/* Financial Trends Chart */}
        {playerHeya?.ledger && (
          <FinancialTrendsChart
            ledger={playerHeya.ledger}
            currentYear={world?.year ?? 0}
            currentWeek={world?.week ?? 0}
          />
        )}

        {/* Income Sources and Expenses */}
        <IncomeExpensesCards weeklyFinances={weeklyFinances} />

        {/* Sponsor Draw */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold">Top Earners</h3>
            <SortMenu
              options={EARNER_SORT_OPTIONS}
              storageKey="basho_sort_economy"
              defaultSortKey="kensho"
              defaultSortOrder="asc"
              onSortChange={(key, order) => {
                setEarnerSortKey(key);
                setEarnerSortOrder(order);
              }}
            />
          </div>
          <SponsorDrawCard topEarners={topEarners} />
        </div>

        {/* Info Note */}
        <EconomyInfoNote />
      </div>
    </AppLayout>
  );
}
