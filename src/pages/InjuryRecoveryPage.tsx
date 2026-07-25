// InjuryRecoveryPage.tsx — Dedicated health & welfare management screen
import { useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/GameContext";
import { InjuryRecoveryPanel } from "@/components/game/InjuryRecoveryPanel";
import { WelfarePanel } from "@/components/game/WelfarePanel";
import { projectMedicalUIDigest, setHeyaDietAction } from "@/presenters/uiDigest";
import { InjuryRiskHeatmap } from "@/components/training/InjuryRiskHeatmap";
import type { DietRegimen } from "@/engine/types/economy";
import { resolveRegistryLabel } from "@/presenters/uiUtilities";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";
import { getHeyaRoster } from "@/engine/queries";

/** injury recovery page. */
export default function InjuryRecoveryPage() {
  const navigate = useNavigate();
  const { state, updateWorld } = useGame();

  useEffect(() => {
    if (!state.world) navigate({ to: "/main-menu", replace: true });
  }, [state.world, navigate]);
  const digest = useMemo(
    () => (state.world ? projectMedicalUIDigest(state.world) : null),
    [state.world]
  );

  const rikishiList = useMemo(() => {
    if (!state.world || !state.playerHeyaId) return [];
    const rng = state.world.rng || new SeededRNG(state.world.seed || "medical_heatmap");
    return getHeyaRoster(state.world, state.playerHeyaId)
      .filter((r) => !r.isRetired)
      .map((r) => {
        const rankLabel = resolveRegistryLabel("ranks", r.rank);

        let injurySummary: string | undefined;
        if (r.injured && r.injuryStatus) {
          const loc = r.injuryStatus.location ? ` ${r.injuryStatus.location}` : "";
          // InjurySeverity is "minor" | "moderate" | "serious" | "none" — map to BardEngine key
          const rawSev = r.injuryStatus.severity as string;
          let sevKey = "moderate";
          if (rawSev === "minor") sevKey = "minor";
          else if (rawSev === "serious") sevKey = "severe";
          const sevLabel = BardEngine.resolve(rng, `ui.labels.injury.severity.${sevKey}`).text;
          const weeks = r.injuryWeeksRemaining?.toString() ?? "?";
          injurySummary = BardEngine.resolve(rng, "ui.labels.injury.summary_format", {
            SEV: sevLabel,
            LOC: loc,
            WEEKS: weeks,
          }).text;
        }

        return {
          id: r.id,
          shikona: r.shikona,
          rankLabel,
          isInjured: r.injured,
          condition: r.condition ?? 100,
          fatigue: r.fatigue ?? 0,
          injurySummary,
        };
      });
  }, [state.world, state.playerHeyaId]);

  const handleSetDiet = useCallback(
    (diet: DietRegimen) => {
      if (!state.world || !state.playerHeyaId) return;
      const success = setHeyaDietAction(state.world, state.playerHeyaId, diet);
      if (success) {
        updateWorld({ ...state.world });
      }
    },
    [state.world, state.playerHeyaId, updateWorld]
  );

  if (!digest) {
    return null;
  }

  return (
    <AppLayout pageTitle="Performance Center" subNavTabs={STABLE_TABS} activeSubTab="medical">
      <Helmet>
        <title>Performance Center — {digest.heyaName} | Basho</title>
      </Helmet>

      <div className="space-y-8">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title="Performance Center"
          lede="Monitor and manage injured wrestlers. Better recovery facilities speed healing."
        />
        <div className="lg:col-span-2 space-y-6">
          <InjuryRiskHeatmap rikishiList={rikishiList} />
          <InjuryRecoveryPanel digest={digest} />
        </div>

        <div className="space-y-6">
          <WelfarePanel digest={digest} onSetDiet={handleSetDiet} />
        </div>
      </div>
    </AppLayout>
  );
}
