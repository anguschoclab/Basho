import { AppLayout } from "@/components/layout/AppLayout";
import { DigestWidget } from "@/components/dashboard/DigestWidget";
import { useGame } from "@/contexts/GameContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Newspaper } from "lucide-react";

export default function WeeklyDigestPage() {
  const { state, digest } = useGame();
  const world = state.world;

  if (!world) {
    return (
      <AppLayout pageTitle="Weekly Report">
        <div className="flex items-center justify-center h-full py-20">
          <EmptyState
            icon={Newspaper}
            title="No world loaded"
            description="Start a game to view the weekly report."
          />
        </div>
      </AppLayout>
    );
  }

  const weekLabel = `${world.year ?? 2025} — Week ${world.week ?? 0}`;

  return (
    <AppLayout pageTitle="Weekly Report">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Report</h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <DigestWidget digest={digest} fullPage />
      </div>
    </AppLayout>
  );
}
