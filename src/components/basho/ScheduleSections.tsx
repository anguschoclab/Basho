/**
 * ScheduleSections.tsx
 *
 * Schedule page sections — division/day filter card and the bout list
 * (rest-day and no-bouts empty states plus east/west match cards).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Swords } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Division } from "@/engine/types/banzuke";
import { needsScheduleForDay } from "@/presenters/uiDigest";
import { DIVISIONS, DIVISION_NAMES } from "@/constants/engine/rankDisplay";
import { getRikishi } from "@/presenters/worldAccess";
import type { WorldState } from "@/presenters/uiDigest";

type BashoMatch = NonNullable<WorldState["currentBasho"]>["matches"][number];

/** Filter card — division select + day select (rest days marked). */
export function ScheduleFilters({
  selectedDivision,
  selectedDay,
  maxDays,
  onDivisionChange,
  onDayChange,
}: {
  selectedDivision: Division;
  selectedDay: number;
  maxDays: number;
  onDivisionChange: (division: Division) => void;
  onDayChange: (day: number) => void;
}) {
  return (
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
          <Select value={selectedDivision} onValueChange={(v) => onDivisionChange(v as Division)}>
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
            onValueChange={(v) => onDayChange(parseInt(v, 10))}
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
  );
}

/** Single scheduled-bout card — east/west names, result or pending icon. */
function MatchCard({
  match,
  index,
  world,
}: {
  match: BashoMatch;
  index: number;
  world: WorldState;
}) {
  const east = getRikishi(world, match.eastRikishiId);
  const west = getRikishi(world, match.westRikishiId);
  const result = match.result;

  return (
    <Card
      key={`${match.day}-${match.eastRikishiId}-${match.westRikishiId}-${index}`}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center p-4 gap-4">
        <div className="text-right">
          <div className={`font-bold text-lg ${result?.winner === "east" ? "text-primary" : ""}`}>
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
          <div className={`font-bold text-lg ${result?.winner === "west" ? "text-primary" : ""}`}>
            {west?.name || match.westRikishiId}
          </div>
          <div className="text-sm text-muted-foreground">West</div>
        </div>
      </div>
    </Card>
  );
}

/** Bout list column — rest-day / empty states, else match cards. */
export function ScheduleBoutList({
  world,
  matches,
  isValidFightDay,
  selectedDivision,
  selectedDay,
}: {
  world: WorldState;
  matches: BashoMatch[];
  isValidFightDay: boolean;
  selectedDivision: Division;
  selectedDay: number;
}) {
  if (!isValidFightDay) {
    return (
      <Card>
        <EmptyState
          icon={CalendarDays}
          title="Rest Day"
          description={`The ${DIVISION_NAMES[selectedDivision]} division does not hold bouts on Day ${selectedDay}.`}
        />
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Swords}
          title="No Bouts Scheduled"
          description="No bouts scheduled for this division and day yet."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {matches.map((match, idx) => (
        <MatchCard
          key={`${match.day}-${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
          match={match}
          index={idx}
          world={world}
        />
      ))}
    </div>
  );
}
