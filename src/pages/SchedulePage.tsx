import { useState, useMemo } from "react";
import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Swords, Trophy } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/control-center";
import { Division } from "@/engine/types/banzuke";
import { getTotalBashodays, needsScheduleForDay } from "@/presenters/uiDigest";
import { DIVISIONS, DIVISION_NAMES } from "@/constants/engine/rankDisplay";
import { getRikishi } from "@/presenters/worldAccess";

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
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Division</label>
                <Select
                  value={selectedDivision}
                  onValueChange={(v) => setSelectedDivision(v as Division)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map((div) => (
                      <SelectItem key={div} value={div}>
                        {DIVISION_NAMES[div]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Day</label>
                <Select
                  value={selectedDay.toString()}
                  onValueChange={(v) => setSelectedDay(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Day {day} {needsScheduleForDay(selectedDivision, day) ? "" : "(Rest)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {!isValidFightDay ? (
              <Card>
                <EmptyState
                  icon={CalendarDays}
                  title="Rest Day"
                  description={`The ${DIVISION_NAMES[selectedDivision]} division does not hold bouts on Day ${selectedDay}.`}
                />
              </Card>
            ) : matches.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Swords}
                  title="No Bouts Scheduled"
                  description="No bouts scheduled for this division and day yet."
                />
              </Card>
            ) : (
              <div className="grid gap-3">
                {matches.map((match, idx) => {
                  const east = getRikishi(world, match.eastRikishiId);
                  const west = getRikishi(world, match.westRikishiId);
                  const result = match.result;

                  return (
                    <Card
                      key={`${match.day}-${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center p-4 gap-4">
                        <div className="text-right">
                          <div
                            className={`font-bold text-lg ${result?.winner === "east" ? "text-primary" : ""}`}
                          >
                            {east?.name || match.eastRikishiId}
                          </div>
                          <div className="text-sm text-muted-foreground">East</div>
                        </div>

                        <div className="flex flex-col items-center justify-center px-4">
                          {result ? (
                            <Badge variant="secondary" className="mb-1">
                              {result.kimariteName}
                            </Badge>
                          ) : (
                            <Swords className="h-5 w-5 text-muted-foreground mb-1" />
                          )}
                          <span className="text-xs font-mono text-muted-foreground">vs</span>
                        </div>

                        <div className="text-left">
                          <div
                            className={`font-bold text-lg ${result?.winner === "west" ? "text-primary" : ""}`}
                          >
                            {west?.name || match.westRikishiId}
                          </div>
                          <div className="text-sm text-muted-foreground">West</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
