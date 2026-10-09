/**
 * AlmanacPage.tsx
 *
 * Records & history shell — tab panels live in
 * ../components/almanac/AlmanacTabs.tsx and derived data in
 * ../hooks/useAlmanacDerived.ts.
 */

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RECORDS_TABS } from "@/constants/ui/navigation";
import { useGame } from "@/contexts/useGame";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Award, Gavel, Swords, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/control-center";
import { useAlmanacDerived } from "@/hooks/useAlmanacDerived";
import {
  AlmanacIntro,
  PastBashosTab,
  RecordsTab,
  TechniquesTab,
  HallOfFameTab,
  OfficialsTab,
} from "@/components/almanac/AlmanacTabs";

export default function AlmanacPage() {
  const { state } = useGame();
  const { world } = state;

  const [activeTab, setActiveTab] = useState("past-bashos");
  const derived = useAlmanacDerived(world);

  if (!world) {
    return (
      <AppLayout pageTitle="Almanac" subNavTabs={RECORDS_TABS} activeSubTab="almanac">
        <Card className="paper py-12 text-center">
          <CardHeader>
            <CardTitle>Almanac unavailable</CardTitle>
            <CardDescription>The world state is not loaded yet.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Almanac" subNavTabs={RECORDS_TABS} activeSubTab="almanac">
      <title>Almanac - The Memory of the World</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── RECORDS ──"
          title="力士名鑑"
          lede="The living memory of the dohyo — records, dynasties, and statistics."
        />
        <AlmanacIntro world={world} derived={derived} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="past-bashos" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Past Bashos
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Record Book
            </TabsTrigger>
            <TabsTrigger value="techniques" className="flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Techniques
            </TabsTrigger>
            <TabsTrigger value="hof" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Hall of Fame
            </TabsTrigger>
            <TabsTrigger value="officials" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Officials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="past-bashos">
            <PastBashosTab world={world} />
          </TabsContent>

          <TabsContent value="records" className="space-y-8">
            <RecordsTab world={world} giantSlayers={derived.giantSlayers} />
          </TabsContent>

          <TabsContent value="techniques">
            <TechniquesTab derived={derived} />
          </TabsContent>

          <TabsContent value="hof">
            <HallOfFameTab />
          </TabsContent>

          <TabsContent value="officials">
            <OfficialsTab world={world} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
