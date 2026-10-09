// MediaPage.tsx — Media & Press coverage dashboard
// Surfaces headlines, media heat, and heya pressure from media.ts engine
import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { PageHeader } from "@/components/layout/control-center";
import { projectMediaUIDigest } from "@/presenters/uiDigest";
import { EventFeed } from "@/components/dashboard/EventFeed";
import {
  PendingMediaCard,
  HeadlinesCard,
  HotRikishiCard,
  HeyaPressureCard,
} from "@/components/media/MediaPageSections";

export default function MediaPage() {
  const { state } = useGame();
  const world = state.world;

  const digest = useMemo(() => {
    if (!world) return null;
    return projectMediaUIDigest(world);
  }, [world]);

  const pendingMediaEvents = useMemo(() => {
    if (!world?.playerHeyaId || !world.governanceLog) return [];
    return world.governanceLog.filter((r) => r.heyaId === world.playerHeyaId && !r.playerChoice);
  }, [world]);

  if (!world) {
    return (
      <AppLayout subNavTabs={ASSOCIATION_TABS} activeSubTab="media" pageTitle="Media">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No world loaded
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Media & Press" subNavTabs={ASSOCIATION_TABS} activeSubTab="media">
      <title>Media & Press — Basho</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="Media & Press"
          lede="Headlines, coverage, and public perception across the sumo world."
        />

        {/* Action Required: pending media events */}
        {pendingMediaEvents.length > 0 && <PendingMediaCard events={pendingMediaEvents} />}

        {/* Top Headlines */}
        <HeadlinesCard world={world} digest={digest} />

        <div className="grid gap-4 md:grid-cols-2">
          {/* Hot Rikishi with Sparklines */}
          <HotRikishiCard digest={digest} />
          {/* Heya Pressure */}
          <HeyaPressureCard digest={digest} />
        </div>

        {/* Global Event Feed */}
        <EventFeed maxEvents={20} minImportance="notable" />
      </div>
    </AppLayout>
  );
}
