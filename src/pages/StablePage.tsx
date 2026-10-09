import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { STABLE_TABS } from "@/constants/ui/navigation";
import { useParams } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { useRequireWorld } from "@/hooks/useRequireWorld";
import { projectRikishi } from "@/presenters/rikishi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/control-center";
import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StableStatsTable } from "@/components/game/StableStatsTable";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { SponsorshipHub } from "@/components/economy/SponsorshipHub";
import { projectSponsorUIDigest } from "@/presenters/projections";
import { ChronicleRoom } from "@/components/stable/ChronicleRoom";
import { GlobalStrategicHub } from "@/components/stable/GlobalStrategicHub";
import type { FacilityId } from "@/engine/types/infrastructure";
import { KeshoMawashiGallery } from "@/components/stable/KeshoMawashiGallery";
import { getHeyaRoster } from "@/presenters/engineAccess";
import {
  RosterTab,
  InstitutionTab,
  AttendantsTab,
  AcademyTab,
} from "@/components/stable/StablePageTabs";

export default function StablePage() {
  const { id: routeId } = useParams({ strict: false });
  const { state, buildInfrastructure } = useGame();
  const { world, playerHeyaId } = state;

  const viewingHeyaId = routeId || playerHeyaId || "";
  const heya = world?.heyas.get(viewingHeyaId) ?? null;

  const hasWorld = useRequireWorld();

  const rawRoster = useMemo(() => {
    if (!world || !heya) return [];
    return getHeyaRoster(world, heya.id);
  }, [world, heya]);

  const rikishiList = useMemo(() => {
    if (!world || !heya) return [];
    return rawRoster.map((r) => projectRikishi(r, world));
  }, [world, heya, rawRoster]);

  if (!hasWorld || !world || !heya) return null;

  if (!heya) {
    return (
      <AppLayout pageTitle="Stable Operations" subNavTabs={STABLE_TABS} activeSubTab="stable">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <EmptyState
            icon={Loader2}
            title="Loading Stable"
            description="Fetching stable operations..."
            className="animate-pulse"
          />
        </div>
      </AppLayout>
    );
  }

  const sponsorData = world ? projectSponsorUIDigest(world) : null;

  const handleUpgrade = (facilityId: FacilityId) => {
    if (!world) return;
    buildInfrastructure(viewingHeyaId, facilityId);
  };

  return (
    <AppLayout pageTitle="Stable Operations" subNavTabs={STABLE_TABS} activeSubTab="stable">
      <title>{heya.name} — Stable Profile</title>

      <div className="space-y-8">
        <PageHeader
          eyebrow="── MY STABLE ──"
          title={heya.name}
          lede={`${rikishiList.length} rikishi · ${heya.ichimon ?? "Independent"} Ichimon`}
        />

        <Tabs defaultValue="roster" className="space-y-6">
          <TabsList className="w-full max-w-4xl flex flex-wrap gap-1 text-[10px] font-black uppercase h-auto">
            <TabsTrigger value="roster" className="flex-1 min-w-20">
              Members
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-20">
              Performance
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-1 min-w-20">
              Gallery
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="flex-1 min-w-20">
              Infrastructure
            </TabsTrigger>
            <TabsTrigger value="sponsorship" className="flex-1 min-w-20">
              Sponsorship
            </TabsTrigger>
            <TabsTrigger value="institution" className="flex-1 min-w-20">
              Institution
            </TabsTrigger>
            <TabsTrigger value="global" className="flex-1 min-w-20">
              Global
            </TabsTrigger>
            <TabsTrigger value="attendants" className="flex-1 min-w-20">
              Attendants
            </TabsTrigger>
            <TabsTrigger value="academy" className="flex-1 min-w-20">
              Academy
            </TabsTrigger>
            <TabsTrigger value="chronicle" className="flex-1 min-w-20">
              Chronicle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sponsorship">
            <SponsorshipHub data={sponsorData} />
          </TabsContent>

          <TabsContent value="gallery">
            {world && <KeshoMawashiGallery world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="chronicle">
            {world && <ChronicleRoom world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="global">
            {world && <GlobalStrategicHub world={world} heyaId={viewingHeyaId} />}
          </TabsContent>

          <TabsContent value="infrastructure">
            <InfrastructureDashboard heya={heya} onUpgrade={handleUpgrade} />
          </TabsContent>

          <RosterTab world={world} heya={heya} rikishiList={rikishiList} rawRoster={rawRoster} />

          <TabsContent value="performance">
            <StableStatsTable rikishiList={rikishiList} />
          </TabsContent>

          <InstitutionTab world={world} heya={heya} />
          <AttendantsTab world={world} heya={heya} />
          <AcademyTab world={world} heya={heya} />
        </Tabs>
      </div>
    </AppLayout>
  );
}
