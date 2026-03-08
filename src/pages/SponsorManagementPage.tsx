// SponsorManagementPage.tsx — Sponsor contract management
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { SponsorContractsPanel } from "@/components/game/SponsorContractsPanel";

export default function SponsorManagementPage() {
  const { state } = useGame();
  const world = state.world;

  const econTabs = [
    { id: "economy", label: "Finances", href: "/economy" },
    { id: "sponsors", label: "Sponsors" },
    { id: "governance", label: "Governance", href: "/governance" },
  ];

  if (!world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Sponsors" subNavTabs={econTabs} activeSubTab="sponsors">
      <Helmet><title>Sponsor Management</title></Helmet>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Sponsor Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage relationships with sponsors and kōenkai members. Renew expiring contracts to maintain income.
          </p>
        </div>
        <SponsorContractsPanel world={world} />
      </div>
    </AppLayout>
  );
}
