// SponsorManagementPage.tsx — Sponsor contract management
import { useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { OFFICE_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { projectSponsorUIDigest } from "@/presenters/uiDigest";
import { SponsorContractsPanel } from "@/components/game/SponsorContractsPanel";
import { SponsorSatisfactionChart } from "@/components/economy/SponsorSatisfactionChart";

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
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Sponsors"
            description="Fetching sponsor contracts and satisfaction..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout subNavTabs={OFFICE_TABS} activeSubTab="sponsors" pageTitle="Sponsor Relations">
      <title>Sponsor Relations | Basho</title>

      <div className="space-y-8">
        <PageHeader
          eyebrow="── OFFICE ──"
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
