// BashoPage.tsx — Redesigned Tournament Page
// Clean layout with prominent day controls, better standings, and bout cards

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { TOURNAMENT_TABS } from "@/constants/ui/navigation";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/control-center";
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
import { BoutNarrativeModal } from "@/components/game/BoutNarrativeModal";
import { MatchDayViewer } from "@/components/game/MatchDayViewer";
import { BashoStandingsEvolution } from "@/components/basho/BashoStandingsEvolution";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Link } from "@tanstack/react-router";
import {
  BASHO_CALENDAR,
  getDayName,
  getTotalBashodays,
  isKeyDay,
  needsScheduleForDay,
  projectBashoUIDigest,
} from "@/presenters/uiDigest";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Division } from "@/engine/types/banzuke";
import type { BoutTactic } from "@/engine/types/combat";
import type { BashoName, BoutResult } from "@/engine/types/basho";
import type { BoutMatchUI, StandingEntry } from "@/presenters/uiDigestTypes";

/** Defines the structure for selected bout. */
interface SelectedBout {
  east: UIRikishi;
  west: UIRikishi;
  result: BoutResult;
  isPlayerBout: boolean;
}

/**
 * Make pair key.
 */
function makePairKey(a: string, b: string) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/** Defines the structure for schedule overview props. */
interface ScheduleOverviewProps {
  currentDay: number;
}

/**
 * schedule overview.
 */
function ScheduleOverview({ currentDay }: ScheduleOverviewProps) {
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

/** basho page. */
export default function BashoPage() {
  const navigate = useNavigate();
  const { state, simulateBout, simulateAllBouts, advanceDay, endBasho, setBoutTactic } = useGame();
  const { world } = state;

  const [selectedBout, setSelectedBout] = useState<SelectedBout | null>(null);
  const [autoShowPlayerBout, setAutoShowPlayerBout] = useState<SelectedBout | null>(null);
  const [showEndBashoConfirm, setShowEndBashoConfirm] = useState(false);
  const [showScheduleOverview, setShowScheduleOverview] = useState(false);
  const lastAutoShownKeyRef = useRef<string | null>(null);

  const bashoDigest = useMemo(() => {
    if (!world) return null;
    return projectBashoUIDigest(world);
  }, [world]);

  const lastBoutKey = useMemo(() => {
    const last = state.lastBoutResult;
    if (!last || !bashoDigest) return null;
    return `${makePairKey(last.winnerRikishiId, last.loserRikishiId)}::${bashoDigest.day}::${last.kimarite || ""}`;
  }, [state.lastBoutResult, bashoDigest]);

  const nextBoutIndex = useMemo(() => {
    if (!bashoDigest) return -1;
    return bashoDigest.matches.findIndex((m: BoutMatchUI) => !m.result);
  }, [bashoDigest]);

  useEffect(() => {
    if (state.phase === "basho_recap" || state.phase === "basho_results") {
      navigate({ to: "/recap" });
    }
  }, [state.phase, navigate]);

  // Auto-show player bout logic reconstruction
  useEffect(() => {
    const last = state.lastBoutResult;
    if (
      !last ||
      !lastBoutKey ||
      lastAutoShownKeyRef.current === lastBoutKey ||
      selectedBout ||
      !bashoDigest
    )
      return;

    const matchToday = bashoDigest.matches.find(
      (m: BoutMatchUI) =>
        (m.eastRikishiId === last.winnerRikishiId && m.westRikishiId === last.loserRikishiId) ||
        (m.eastRikishiId === last.loserRikishiId && m.westRikishiId === last.winnerRikishiId)
    );

    if (matchToday && matchToday.isPlayerBout && matchToday.eastRikishi && matchToday.westRikishi) {
      setAutoShowPlayerBout({
        east: matchToday.eastRikishi,
        west: matchToday.westRikishi,
        result: last,
        isPlayerBout: true,
      });
      lastAutoShownKeyRef.current = lastBoutKey;
    }
  }, [bashoDigest, lastBoutKey, selectedBout, state.lastBoutResult]);

  const handleSimulateNext = useCallback(() => {
    if (nextBoutIndex >= 0) {
      const match = bashoDigest?.matches[nextBoutIndex];
      simulateBout(nextBoutIndex, match?.boutId);
    }
  }, [nextBoutIndex, simulateBout, bashoDigest]);

  const handleSimulateAll = useCallback(() => {
    simulateAllBouts();
  }, [simulateAllBouts]);

  const handleNextDay = useCallback(() => {
    if (bashoDigest && bashoDigest.day >= 15) setShowEndBashoConfirm(true);
    else advanceDay();
  }, [bashoDigest, advanceDay]);

  const handleTacticChange = useCallback(
    (id: string, tactic: string) => setBoutTactic(id, tactic as BoutTactic),
    [setBoutTactic]
  );

  const confirmEndBasho = useCallback(() => {
    setShowEndBashoConfirm(false);
    endBasho();
    navigate({ to: "/recap" });
  }, [endBasho, navigate]);

  if (!world) return null;

  if (!bashoDigest) {
    return (
      <AppLayout pageTitle="Current Basho" subNavTabs={TOURNAMENT_TABS} activeSubTab="basho">
        <Helmet>
          <title>Current Basho | Basho</title>
        </Helmet>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <div className="space-y-2">
            <p className="font-display text-xl font-bold uppercase tracking-tight">
              No Active Tournament
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Advance time on the Control Center to begin the next basho.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Return to Control Center
          </Button>
        </div>
      </AppLayout>
    );
  }

  const {
    bashoName,
    day,
    matches,
    standings,
    playerRikishiIds,
    completedBouts,
    dayProgress,
    seasonalFlavor,
  } = bashoDigest;
  const bashoInfo = BASHO_CALENDAR[bashoName as keyof typeof BASHO_CALENDAR];
  const dayInfo = getDayName(day);
  const remainingBouts = matches.length - completedBouts;

  return (
    <AppLayout
      pageTitle={bashoInfo?.nameEn || "Tournament"}
      subNavTabs={TOURNAMENT_TABS}
      activeSubTab="basho"
    >
      <Helmet>
        <title>{`${bashoInfo?.nameEn || "Tournament"} Day ${day}`}</title>
      </Helmet>

      <div className="space-y-4">
        {/* ═══════════ DAY HEADER ═══════════ */}
        <PageHeader
          eyebrow="── TOURNAMENT ──"
          title={bashoInfo?.nameJa ?? "Basho"}
          lede={`${dayInfo?.dayJa ?? `Day ${day}`} · ${bashoInfo?.location ?? "—"} · ${completedBouts}/${matches.length} bouts complete${seasonalFlavor ? ` · ${seasonalFlavor}` : ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                ← Dashboard
              </Button>
              <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                Day {day}/{getTotalBashodays("makuuchi")}
              </Badge>
              {isKeyDay(day) && (
                <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Key Day</Badge>
              )}
            </div>
          }
        />
        <div className="flex items-center justify-end gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSimulateNext}
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
              onClick={handleSimulateAll}
              disabled={remainingBouts === 0}
              className="gap-1.5"
              tooltip={remainingBouts === 0 ? "All bouts for today have been simulated" : undefined}
            >
              <FastForward className="h-3.5 w-3.5" /> Sim All
            </Button>
            {remainingBouts === 0 && (
              <Button size="sm" onClick={handleNextDay} className="gap-1.5" id="advance-basho-btn">
                {day >= 15 ? "End Basho" : "Next Day"} <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Day progress */}
        <Progress value={dayProgress} className="h-1" />

        {/* Global Cup Banner - During Interim Weeks */}
        {world.globalCup?.isActive && day >= 15 && (
          <Card className="border-amber-500/30 bg-amber-950/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-amber-400" />
                  <div>
                    <h3 className="font-display font-bold text-amber-400">
                      Global Cup {world.globalCup.year} - {world.globalCup.phase}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {world.globalCup.participants.length} international competitors
                    </p>
                  </div>
                </div>
                <Link to="/global-cup">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/30 text-amber-400"
                  >
                    View Tournament
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════ MAIN LAYOUT ═══════════ */}
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Schedule Overview - Collapsible */}
          <Collapsible
            open={showScheduleOverview}
            onOpenChange={setShowScheduleOverview}
            className="lg:order-3 lg:col-span-4"
          >
            <Card className="paper">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-lg">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Division Schedule
                </h3>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${showScheduleOverview ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="px-4 pb-4 pt-0">
                  <ScheduleOverview currentDay={day} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Standings sidebar */}
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
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Match viewer */}
          <div className="lg:col-span-3 lg:order-1 space-y-3">
            <MatchDayViewer
              matches={matches}
              world={world}
              playerRikishiIds={new Set(playerRikishiIds)}
              onSimulateBout={simulateBout}
              onSimulateAll={simulateAllBouts}
              onTacticChange={handleTacticChange}
              onEndDay={handleNextDay}
              highlightRikishiId={state.selectedRikishiId || undefined}
              playerTactics={state.boutTactics}
              onBoutClick={(match: BoutMatchUI) => {
                if (!match.result || !match.eastRikishi || !match.westRikishi) return;
                setSelectedBout({
                  east: match.eastRikishi,
                  west: match.westRikishi,
                  result: match.result,
                  isPlayerBout: match.isPlayerBout,
                });
              }}
            />
          </div>
        </div>

        {/* Standings evolution chart — active basho only */}
        {world.cyclePhase === "active_basho" && world.currentBasho && (
          <BashoStandingsEvolution basho={world.currentBasho} rikishiMap={world.rikishi} />
        )}
      </div>

      {/* Modals */}
      {selectedBout && (
        <BoutNarrativeModal
          open={!!selectedBout}
          onOpenChange={(open) => !open && setSelectedBout(null)}
          east={selectedBout.east}
          west={selectedBout.west}
          result={selectedBout.result}
          bashoName={bashoName as BashoName}
          day={day}
        />
      )}
      {autoShowPlayerBout && !selectedBout && (
        <BoutNarrativeModal
          open={!!autoShowPlayerBout}
          onOpenChange={(open) => !open && setAutoShowPlayerBout(null)}
          east={autoShowPlayerBout.east}
          west={autoShowPlayerBout.west}
          result={autoShowPlayerBout.result}
          bashoName={bashoName as BashoName}
          day={day}
        />
      )}
      <AlertDialog open={showEndBashoConfirm} onOpenChange={setShowEndBashoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Tournament?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize results, update rankings, and advance to the off-season.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndBasho}>End Basho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
