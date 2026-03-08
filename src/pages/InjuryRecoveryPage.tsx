// InjuryRecoveryPage.tsx — Dedicated rehabilitation management screen
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/GameContext";
import { InjuryRecoveryPanel } from "@/components/game/InjuryRecoveryPanel";

export default function InjuryRecoveryPage() {
  const { state } = useGame();
  const world = state.world;

  const stableTabs = [
    { id: "stable", label: "Overview", href: "/stable" },
    { id: "training", label: "Training", href: "/training" },
    { id: "injuries", label: "Injuries" },
    { id: "economy", label: "Economy", href: "/economy" },
  ];

  if (!world) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Injury Recovery" subNavTabs={stableTabs} activeSubTab="injuries">
      <Helmet><title>Injury Recovery — Rehabilitation</title></Helmet>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Rehabilitation Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage injured wrestlers. Better recovery facilities speed healing.
          </p>
        </div>
        <InjuryRecoveryPanel world={world} />
      </div>
    </AppLayout>
  );
}
