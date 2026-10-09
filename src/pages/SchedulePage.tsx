import { useState, useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/control-center";
import { Division } from "@/engine/types/banzuke";
import { getTotalBashodays, needsScheduleForDay } from "@/presenters/uiDigest";
import { getRikishi } from "@/presenters/worldAccess";
import { ScheduleFilters, ScheduleBoutList } from "@/components/basho/ScheduleSections";

/** schedule page. */
export default function SchedulePage() {
  const { state } = useGame();
  const world = state.world;
  const currentBasho = world?.currentBasho;

  const [selectedDivision, setSelectedDivision] = useState<Division>("makuuchi");
  const [selectedDay, setSelectedDay] = useState<number>(currentBasho?.day || 1);

  const maxDays = useMemo(() => getTotalBashodays(selectedDivision), [selectedDivision]);

  // Ensure selected day is valid for division when switching
  if (selectedDay > maxDays) {
    setSelectedDay(maxDays);
  }

  const matches = useMemo(() => {
    if (!currentBasho || !world) return [];
    return currentBasho.matches.filter((m) => {
      if (m.day !== selectedDay) return false;
      const eastRikishi = getRikishi(world, m.eastRikishiId);
      return eastRikishi?.division === selectedDivision;
    });
  }, [currentBasho, selectedDay, selectedDivision, world]);

  const isValidFightDay = needsScheduleForDay(selectedDivision, selectedDay);

  if (!world || !currentBasho) {
    return (
      <AppLayout subNavTabs={TOURNAMENT_TABS} activeSubTab="schedule" pageTitle="Schedule">
        <Card>
          <EmptyState
            icon={Trophy}
            title="No active basho"
            description="Advance time to begin the tournament"
          />
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout subNavTabs={TOURNAMENT_TABS} activeSubTab="schedule" pageTitle="Schedule">
      <title>Schedule | Basho</title>

      <div className="space-y-6">
        <PageHeader
          eyebrow="── TOURNAMENT ──"
          title="Schedule"
          lede="View upcoming and past bouts for all divisions."
          actions={
            <Badge variant="outline" className="px-3 py-1">
              {currentBasho.bashoName.charAt(0).toUpperCase() + currentBasho.bashoName.slice(1)}{" "}
              Basho {currentBasho.year}
            </Badge>
          }
        />

        <div className="grid gap-6 md:grid-cols-[250px_1fr]">
          <ScheduleFilters
            selectedDivision={selectedDivision}
            selectedDay={selectedDay}
            maxDays={maxDays}
            onDivisionChange={setSelectedDivision}
            onDayChange={setSelectedDay}
          />

          <div className="space-y-4">
            <ScheduleBoutList
              world={world}
              matches={matches}
              isValidFightDay={isValidFightDay}
              selectedDivision={selectedDivision}
              selectedDay={selectedDay}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
