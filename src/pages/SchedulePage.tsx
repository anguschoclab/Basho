import { useState, useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Swords } from "lucide-react";
import { Division } from "@/engine/types";
import { needsScheduleForDay, getTotalBashodays } from "@/engine/schedule";

const DIVISIONS: Division[] = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];
const DIVISION_NAMES: Record<Division, string> = {
  makuuchi: "Makuuchi",
  juryo: "Juryo",
  makushita: "Makushita",
  sandanme: "Sandanme",
  jonidan: "Jonidan",
  jonokuchi: "Jonokuchi"
};

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
    if (!currentBasho) return [];
    return currentBasho.matches.filter(m => {
      if (m.day !== selectedDay) return false;
      const eastRikishi = world.rikishi.get(m.eastRikishiId);
      return eastRikishi?.division === selectedDivision;
    });
  }, [currentBasho, selectedDay, selectedDivision, world]);

  const isValidFightDay = needsScheduleForDay(selectedDivision, selectedDay);

  if (!world || !currentBasho) {
    return (
      <AppLayout>
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">Schedule Management</h1>
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active basho currently.
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Schedule Management</h2>
            <p className="text-muted-foreground mt-1">
              View upcoming and past bouts for all divisions across the tournament.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {currentBasho.bashoName.charAt(0).toUpperCase() + currentBasho.bashoName.slice(1)} Basho {currentBasho.year}
            </Badge>
          </div>
        </div>

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
                <Select value={selectedDivision} onValueChange={(v) => setSelectedDivision(v as Division)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIVISIONS.map(div => (
                      <SelectItem key={div} value={div}>{DIVISION_NAMES[div]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Day</label>
                <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v, 10))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxDays }, (_, i) => i + 1).map(day => (
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
                <CardContent className="py-12 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">Rest Day</h3>
                  <p className="text-muted-foreground mt-1">
                    The {DIVISION_NAMES[selectedDivision]} division does not hold bouts on Day {selectedDay}.
                  </p>
                </CardContent>
              </Card>
            ) : matches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No bouts scheduled for this division and day yet.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {matches.map((match, idx) => {
                  const east = world.rikishi.get(match.eastRikishiId);
                  const west = world.rikishi.get(match.westRikishiId);
                  const result = match.result;

                  return (
                    <Card key={`${match.day}-${match.eastRikishiId}-${match.westRikishiId}-${idx}`} className="overflow-hidden">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center p-4 gap-4">
                        <div className="text-right">
                          <div className={`font-bold text-lg ${result?.winner === 'east' ? 'text-primary' : ''}`}>
                            {east?.name || match.eastRikishiId}
                          </div>
                          <div className="text-sm text-muted-foreground">East</div>
                        </div>

                        <div className="flex flex-col items-center justify-center px-4">
                          {result ? (
                            <Badge variant="secondary" className="mb-1">{result.kimariteName}</Badge>
                          ) : (
                            <Swords className="h-5 w-5 text-muted-foreground mb-1" />
                          )}
                          <span className="text-xs font-mono text-muted-foreground">vs</span>
                        </div>

                        <div className="text-left">
                          <div className={`font-bold text-lg ${result?.winner === 'west' ? 'text-primary' : ''}`}>
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
