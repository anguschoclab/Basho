// SponsorManagementPage.tsx — Sponsor contract management
import { useMemo } from "react";
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/navigation";
import { useGame } from "@/contexts/GameContext";
import { projectSponsorUIDigest } from "@/presenters/uiDigest";
import { SponsorContractsPanel } from "@/components/game/SponsorContractsPanel";

/** sponsor management page. */
export default function SponsorManagementPage() {
  const { state } = useGame();
  const digest = useMemo(
    () => (state.world ? projectSponsorUIDigest(state.world) : null),
    [state.world]
  );

  if (!digest) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center gap-3 p-8">
        <p className="font-display font-bold text-lg">No Active Game</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start or load a game to manage sponsor relationships.
        </p>
      </div>
    );
  }

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="sponsors" pageTitle="Sponsor Relations">
      <Helmet>
        <title>Sponsor Relations | Basho</title>
      </Helmet>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Sponsor Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage relationships with sponsors and kōenkai members. Renew expiring contracts to
            maintain income.
          </p>
        </div>
        <SponsorContractsPanel digest={digest} />
      </div>
    </AppLayout>
  );
}
