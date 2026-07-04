import { useMemo, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/GameContext";
import { SponsorsPanel } from "@/components/game/SponsorsPanel";
import { InstitutionPanel } from "@/components/game/InstitutionPanel";
import { projectHeyaData } from "@/presenters/projections/heyaProjections";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import { toast } from "sonner";
import { safeRunwayBand, safeKoenkaiBand } from "@/components/economy/economyUtils";
import { FinancialHealthOverview } from "@/components/economy/FinancialHealthOverview";
import { BailoutCard } from "@/components/economy/BailoutCard";
import { error } from "@/engine/utils/Logger";
import { DebtSection } from "@/components/economy/DebtSection";
import { KoenkaiSekitoriCards } from "@/components/economy/KoenkaiSekitoriCards";
import { IncomeExpensesCards } from "@/components/economy/IncomeExpensesCards";
import { SponsorDrawCard } from "@/components/economy/SponsorDrawCard";
import { EconomyInfoNote } from "@/components/economy/EconomyInfoNote";
import { FinancialTrendsChart } from "@/components/economy/FinancialTrendsChart";

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

/** economy page. */
export default function EconomyPage() {
  const { state } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const world = state.world;

  const playerHeya = useMemo(() => {
    if (!world || !state.playerHeyaId) return null;
    return world.heyas.get(state.playerHeyaId) || null;
  }, [world, state.playerHeyaId]);

  const handleBailoutRequest = useCallback(() => {
    if (!world || !state.playerHeyaId || !playerHeya) return;

    if (playerHeya.funds >= 0) {
      toast.error("Emergency funding is only available when in significant debt.");
      return;
    }

    if (playerHeya.funds > -5_000_000) {
      toast.info(
        "The Association only considers bailouts for stables with debts exceeding ¥5,000,000."
      );
      return;
    }

    sendCommand({ type: "REQUEST_BAILOUT", heyaId: state.playerHeyaId });
    toast.success("Emergency bailout requested. Processing...");
  }, [state.playerHeyaId, playerHeya, sendCommand, world]);

  const playerRikishi = useMemo(() => {
    if (!playerHeya || !world) return [];
    const ids: string[] = Array.isArray(playerHeya.rikishiIds) ? playerHeya.rikishiIds : [];

    // ⚡ Bolt Optimization: Use a single for...of loop instead of .map().filter()
    // This eliminates intermediate array allocations.
    const result: NonNullable<ReturnType<typeof world.rikishi.get>>[] = [];
    for (const id of ids) {
      const rikishi = world.rikishi.get(id);
      if (rikishi) {
        result.push(rikishi);
      }
    }
    return result;
  }, [playerHeya, world]);

  // Sekitori count
  const sekitoriCount = useMemo(() => {
    if (!playerRikishi) return 0;
    let count = 0;
    for (const r of playerRikishi) {
      if (r?.division === "makuuchi" || r?.division === "juryo") {
        count++;
      }
    }
    return count;
  }, [playerRikishi]);

  // Top earners
  const topEarners = useMemo(() => {
    return (playerRikishi as Array<NonNullable<(typeof playerRikishi)[number]>>)
      .filter((r): r is NonNullable<typeof r> => r && typeof r === "object")
      .sort((a, b) => {
        const av = Number(a.economics?.careerKenshoWon ?? 0) || 0;
        const bv = Number(b.economics?.careerKenshoWon ?? 0) || 0;
        return bv - av;
      })
      .slice(0, 5);
  }, [playerRikishi]);

  // Calculate actual weekly finances - moved before early return for React Hook rules
  const weeklyFinances = useMemo(() => {
    if (!world || !playerHeya) return null;
    try {
      return calculateHeyaWeeklyFinances(playerHeya, world);
    } catch (e) {
      error("Failed to calculate finances", "EconomyPage", e);
      return null;
    }
  }, [world, playerHeya]);

  if (!playerHeya) {
    return <div className="p-6 text-center text-muted-foreground">No heya selected.</div>;
  }

  const runwayBand = safeRunwayBand(playerHeya.runwayBand || "unknown");
  const koenkaiBand = safeKoenkaiBand(
    (playerHeya as typeof playerHeya & { koenkaiBand?: string }).koenkaiBand || "unknown"
  );

  const hasFinancialRisk = !!(
    playerHeya as typeof playerHeya & { riskIndicators?: { financial?: boolean } }
  )?.riskIndicators?.financial;
  const canRequestBailout = playerHeya.funds < 0;

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="economy" pageTitle="Financial Management">
      <Helmet>
        <title>Economy — {playerHeya.name} | Basho</title>
      </Helmet>

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
        />

        {/* Grid: Koenkai & Sekitori */}
        <KoenkaiSekitoriCards koenkaiBand={koenkaiBand} sekitoriCount={sekitoriCount} />

        <SponsorsPanel />

        {/* Institution Health */}
        {playerHeya &&
          world &&
          (() => {
            const data = projectHeyaData(world, playerHeya.id);
            if (!data) return null;
            return (
              <InstitutionPanel
                heya={playerHeya}
                oyakata={data.oyakata}
                oyakataQuirks={data.oyakataQuirks}
                oyakataTraits={data.oyakataTraits}
              />
            );
          })()}

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
        <SponsorDrawCard topEarners={topEarners} />

        {/* Info Note */}
        <EconomyInfoNote />
      </div>
    </AppLayout>
  );
}
