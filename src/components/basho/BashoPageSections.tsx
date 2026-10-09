/**
 * BashoPageSections.tsx
 *
 * Sections extracted from BashoPage: day header/controls, jungyo results,
 * global cup banner, schedule overview collapsible, standings sidebar,
 * and the bout/end-basho modals.
 */

import { Link, useNavigate } from "@tanstack/react-router";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BoutNarrativeModal } from "@/components/game/BoutNarrativeModal";
import {
  Play,
  FastForward,
  ChevronRight,
  Trophy,
  Star,
  Crown,
  Calendar,
  ChevronDown,
  Globe,
} from "lucide-react";
import {
  getTotalBashodays,
  needsScheduleForDay,
} from "@/presenters/uiDigest";
import type { WorldState } from "@/presenters/uiDigest";
import type { Division } from "@/engine/types/banzuke";
import type { BashoName } from "@/engine/types/basho";
import type { StandingEntry } from "@/presenters/uiDigestTypes";
import { selectKimariteObservedShare } from "@/presenters/selectors";
import type { SelectedBout } from "@/hooks/useBashoPageState";
import type { projectOfficials } from "@/presenters/officialsProjections";

type OfficialsProjection = ReturnType<typeof projectOfficials>;

interface DayHeaderProps {
  day: number;
  remainingBouts: number;
  nextBoutIndex: number;
  dayProgress: number;
  onSimulateNext: () => void;
  onSimulateAll: () => void;
  onNextDay: () => void;
}

/** Day simulate/advance controls + progress bar. */
export function BashoDayControls({
  day,
  remainingBouts,
  nextBoutIndex,
  dayProgress,
  onSimulateNext,
  onSimulateAll,
  onNextDay,
}: DayHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onSimulateNext}
            disabled={remainingBouts === 0 || nextBoutIndex < 0}
            className="gap-1.5"
            tooltip={
              remainingBouts === 0 || nextBoutIndex < 0
                ? "All bouts for today have been simulated"
                : undefined
            }
          >
            <Play className="h-3.5 w-3.5" /> Next Bout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onSimulateAll}
            disabled={remainingBouts === 0}
            className="gap-1.5"
            tooltip={remainingBouts === 0 ? "All bouts for today have been simulated" : undefined}
          >
            <FastForward className="h-3.5 w-3.5" /> Sim All
          </Button>
          {remainingBouts === 0 && (
            <Button size="sm" onClick={onNextDay} className="gap-1.5" id="advance-basho-btn">
              {day >= 15 ? "End Basho" : "Next Day"} <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Day progress */}
      <Progress value={dayProgress} className="h-1" />
    </>
  );
}

/** Empty state when no tournament is active. */
export function NoActiveBashoEmpty() {
  const navigate = useNavigate();
  return (
    <AppLayout pageTitle="Current Basho" subNavTabs={TOURNAMENT_TABS} activeSubTab="basho">
      <title>Current Basho | Basho</title>

      <Card className="m-6 border-dashed">
        <EmptyState
          icon={Trophy}
          title="No Active Tournament"
          description="Advance time on the Control Center to begin the next basho."
          action={{
            label: "Return to Control Center",
            onClick: () => navigate({ to: "/dashboard" }),
            variant: "outline",
          }}
        />
      </Card>
    </AppLayout>
  );
}

/** Jungyo (exhibition) results from event log. */
export function JungyoResultsCard({ world }: { world: WorldState }) {
  const jungyoEvents = (world.events?.log ?? []).filter(
    (e) =>
      e.category === "discipline" &&
      (e.data?.incident === "exhibition_victory" || e.data?.incident === "exhibition_defeat")
  );
  if (jungyoEvents.length === 0) return null;
  return (
    <Card data-testid="jungyo-results-section">
      <CardContent className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Jungyo (Exhibition) Results
        </h3>
        <div className="space-y-2">
          {jungyoEvents.slice(0, 10).map((e, i) => (
            <div key={`${e.id ?? i}`} className="flex items-center gap-2 text-xs">
              <Badge
                variant={e.data?.incident === "exhibition_victory" ? "default" : "outline"}
                className="text-[10px]"
              >
                {e.data?.incident === "exhibition_victory" ? "WIN" : "LOSS"}
              </Badge>
              <span className="flex-1 truncate">
                {typeof e.data?.reason === "string" ? e.data.reason : "Exhibition bout"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Global Cup Banner - During Interim Weeks. */
export function GlobalCupBanner({ world, day }: { world: WorldState; day: number }) {
  if (!world.globalCup?.isActive || day < 15) return null;
  const cup = world.globalCup;
  return (
    <Card className="border-gold/30 bg-gold/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gold" />
            <div>
              <h3 className="font-display font-bold text-gold">
                Global Cup {cup.year} - {cup.phase}
              </h3>
              <p className="text-xs text-muted-foreground">
                {cup.participants.length} international competitors
              </p>
            </div>
          </div>
          <Link to="/global-cup">
            <Button size="sm" variant="outline" className="border-gold/30 text-gold">
              View Tournament
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/** Division schedule overview grid. */
function ScheduleOverview({ currentDay }: { currentDay: number }) {
  const divisions: Division[] = [
    "makuuchi",
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        <strong>Schedule Legend:</strong> Lower divisions fight on odd days only (1,3,5,7,9,11,13)
      </div>

      {divisions.map((division) => {
        const totalDays = getTotalBashodays(division);
        const divisionName = division.charAt(0).toUpperCase() + division.slice(1);

        return (
          <div key={division} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{divisionName}</span>
              <span className="text-xs text-muted-foreground">{totalDays} days</span>
            </div>

            <div className="grid grid-cols-15 gap-1">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => {
                const needsScheduling = needsScheduleForDay(division, day);
                const isCurrent = day === currentDay;
                const isPast = day < currentDay;

                return (
                  <div
                    key={day}
                    className={`
                      h-6 w-6 rounded text-xs font-mono flex items-center justify-center
                      ${
                        needsScheduling
                          ? isCurrent
                            ? "bg-primary text-primary-foreground"
                            : isPast
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary/20 text-primary"
                          : "bg-transparent text-muted-foreground/30 line-through"
                      }
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Collapsible division schedule panel. */
export function ScheduleOverviewPanel({
  day,
  open,
  onOpenChange,
}: {
  day: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="lg:order-3 lg:col-span-4">
      <Card className="paper">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Division Schedule
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            <ScheduleOverview currentDay={day} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Standings sidebar. */
export function BashoStandingsSidebar({
  standings,
  playerRikishiIds,
}: {
  standings: StandingEntry[];
  playerRikishiIds: string[];
}) {
  return (
    <Card className="paper lg:order-2">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" /> Standings
        </h3>
        <div className="space-y-1">
          {standings.map((entry: StandingEntry, idx: number) => {
            const rid = entry?.rikishi?.id as string | undefined;
            const isPlayer = !!rid && playerRikishiIds.includes(rid);
            return (
              <div
                key={rid ?? `l-${idx}`}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
                  isPlayer
                    ? "bg-primary/10 text-primary font-semibold"
                    : idx % 2 === 0
                      ? "bg-muted/30"
                      : ""
                }`}
              >
                <span className="w-4 text-muted-foreground text-right shrink-0">
                  {idx === 0 ? <Crown className="h-3 w-3 text-gold inline" /> : `${idx + 1}`}
                </span>
                {isPlayer && <Star className="h-2.5 w-2.5 shrink-0" fill="currentColor" />}
                <span className="flex-1 font-display truncate">
                  {entry?.rikishi?.shikona ?? "—"}
                </span>
                <span className="font-mono shrink-0">
                  {entry?.wins ?? 0}-{entry?.losses ?? 0}
                </span>
                {entry?.rikishi?.kihakuIsenScore !== undefined &&
                  entry?.rikishi?.kihakuIsenScore > 0 && (
                    <span
                      className="text-[10px] font-mono text-gold/70 shrink-0"
                      title="Kihaku (fighting spirit)"
                      data-testid={`kihaku-standings-${rid}`}
                    >
                      {entry.rikishi.kihakuIsenScore}
                    </span>
                  )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Bout narrative modals + end-basho confirmation. */
export function BashoModals({
  world,
  bashoName,
  day,
  officialsProjection,
  selectedBout,
  autoShowPlayerBout,
  onCloseSelected,
  onCloseAutoShow,
  showEndBashoConfirm,
  onEndBashoChange,
  onConfirmEndBasho,
}: {
  world: WorldState;
  bashoName: BashoName;
  day: number;
  officialsProjection: OfficialsProjection;
  selectedBout: SelectedBout | null;
  autoShowPlayerBout: SelectedBout | null;
  onCloseSelected: () => void;
  onCloseAutoShow: () => void;
  showEndBashoConfirm: boolean;
  onEndBashoChange: (open: boolean) => void;
  onConfirmEndBasho: () => void;
}) {
  return (
    <>
      {selectedBout && (
        <BoutNarrativeModal
          open={!!selectedBout}
          onOpenChange={(open) => !open && onCloseSelected()}
          east={selectedBout.east}
          west={selectedBout.west}
          result={selectedBout.result}
          bashoName={bashoName}
          day={day}
          gyojiName={
            officialsProjection.gyoji.find((g) => g.id === selectedBout.result.gyojiId)?.name
          }
          gyojiAccuracy={
            officialsProjection.gyoji.find((g) => g.id === selectedBout.result.gyojiId)?.accuracy
          }
          kimariteObservedPct={selectKimariteObservedShare(world, selectedBout.result.kimarite)}
        />
      )}
      {autoShowPlayerBout && !selectedBout && (
        <BoutNarrativeModal
          open={!!autoShowPlayerBout}
          onOpenChange={(open) => !open && onCloseAutoShow()}
          east={autoShowPlayerBout.east}
          west={autoShowPlayerBout.west}
          result={autoShowPlayerBout.result}
          bashoName={bashoName}
          day={day}
          gyojiName={
            officialsProjection.gyoji.find((g) => g.id === autoShowPlayerBout.result.gyojiId)?.name
          }
          gyojiAccuracy={
            officialsProjection.gyoji.find((g) => g.id === autoShowPlayerBout.result.gyojiId)
              ?.accuracy
          }
          kimariteObservedPct={selectKimariteObservedShare(
            world,
            autoShowPlayerBout.result.kimarite
          )}
        />
      )}
      <AlertDialog open={showEndBashoConfirm} onOpenChange={onEndBashoChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize results, update rankings, and advance to the off-season.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmEndBasho}>End Basho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
