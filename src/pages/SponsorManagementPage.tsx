// SponsorManagementPage.tsx — Sponsor contract management
import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/page-shell/index";
import { useGame } from "@/state/game/useGame";
import { projectSponsorUIDigest } from "@/presenters/uiDigest";
import { SponsorContractsPanel } from "@/components/economy/SponsorContractsPanel";
import { SponsorSatisfactionChart } from "@/components/economy/SponsorSatisfactionChart";
import { LoadingPanel } from "@/components/ui/LoadingPanel";

/** sponsor management page. */
export default function SponsorManagementPage() {
  const { state } = useGame();
  const digest = useMemo(
    () => (state.world ? projectSponsorUIDigest(state.world) : null),
    [state.world]
  );

  if (!digest) {
    return (
      <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="sponsors" pageTitle="Sponsor Relations">
        <LoadingPanel
          title="Loading Sponsors"
          description="Fetching sponsor contracts and satisfaction..."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="sponsors" pageTitle="Sponsor Relations">
      <title>Sponsor Relations | Basho</title>

      <div className="space-y-8">
        <PageHeader
          eyebrow="OFFICE"
          title="Sponsor Contracts"
          lede="Manage relationships with sponsors and kōenkai members. Renew expiring contracts to maintain income."
        />
        <SponsorSatisfactionChart
          sponsors={digest.activeSponsors.map((s) => ({
            id: s.sponsorId,
            name: s.name,
            satisfaction: s.satisfaction,
            tier: s.tier,
            active: true,
          }))}
        />
        <SponsorContractsPanel digest={digest} />
      </div>
    </AppLayout>
  );
}
