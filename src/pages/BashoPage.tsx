// BashoPage.tsx — Redesigned Tournament Page
// Clean layout with prominent day controls, better standings, and bout cards

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { TOURNAMENT_TABS } from "@/constants/navigation";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, FastForward, ChevronRight, Trophy, Star, Crown, Calendar, ChevronDown } from "lucide-react";
import { 
  BASHO_CALENDAR, 
  getDayName, 
  getSeasonalFlavor, 
  getTotalBashodays, 
  isKeyDay, 
  needsScheduleForDay,
  projectBashoUIDigest 
} from "@/presenters/uiDigest";
import type { UIRikishi } from "@/presenters/uiModels";

/** Type representing match like. */
type MatchLike = {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: any;
  eastRikishi?: UIRikishi | null;
  westRikishi?: UIRikishi | null;
  isPlayerBout?: boolean;
};

/** Defines the structure for selected bout. */
interface SelectedBout {
  east: UIRikishi;
  west: UIRikishi;
  result: any; // BoutResult projection
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
  const divisions = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];
  
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        <strong>Schedule Legend:</strong> Lower divisions fight on odd days only (1,3,5,7,9,11,13)
      </div>
      
      {divisions.map((division) => {
        const totalDays = getTotalBashodays(division as any);
        const divisionName = division.charAt(0).toUpperCase() + division.slice(1);
        
        return (
          <div key={division} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{divisionName}</span>
              <span className="text-xs text-muted-foreground">{totalDays} days</span>
            </div>
            
            <div className="grid grid-cols-15 gap-1">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => {
                const needsScheduling = needsScheduleForDay(division as any, day);
                const isCurrent = day === currentDay;
                const isPast = day < currentDay;
                
                return (
                  <div
                    key={day}
                    className={`
                      h-6 w-6 rounded text-xs font-mono flex items-center justify-center
                      ${needsScheduling 
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
    const last = (state as any).lastBoutResult;
    if (!last || !bashoDigest) return null;
    return `${makePairKey(last.winnerRikishiId, last.loserRikishiId)}::${bashoDigest.day}::${last.kimarite || ""}`;
  }, [(state as any).lastBoutResult, bashoDigest]);

  useEffect(() => {
    if (state.phase === "basho_recap" || state.phase === "basho_results") { navigate({ to: "/recap" }); return; }
    if (!world?.currentBasho) navigate({ to: "/" });
  }, [world, navigate, state.phase]);

  // Auto-show player bout logic reconstruction
  useEffect(() => {
    const last = (state as any).lastBoutResult;
    if (!last || !lastBoutKey || lastAutoShownKeyRef.current === lastBoutKey || selectedBout || !bashoDigest) return;
    
    const matchToday = bashoDigest.matches.find((m: any) => 
      (m.eastRikishiId === last.winnerRikishiId && m.westRikishiId === last.loserRikishiId) ||
      (m.eastRikishiId === last.loserRikishiId && m.westRikishiId === last.winnerRikishiId)
    );

    if (matchToday && matchToday.isPlayerBout && matchToday.eastRikishi && matchToday.westRikishi) {
      setAutoShowPlayerBout({ 
        east: matchToday.eastRikishi, 
        west: matchToday.westRikishi, 
        result: last, 
        isPlayerBout: true 
      });
      lastAutoShownKeyRef.current = lastBoutKey;
    }
  }, [bashoDigest, lastBoutKey, selectedBout, state.lastBoutResult]);

  const handleSimulateNext = () => { if (bashoDigest && bashoDigest.matches.findIndex((m: any) => !m.result) >= 0) simulateBout(bashoDigest.matches.findIndex((m: any) => !m.result)); };
  const handleSimulateAll = () => { simulateAllBouts(); };
  const handleNextDay = () => {
    if (bashoDigest && bashoDigest.day >= 15) setShowEndBashoConfirm(true);
    else advanceDay();
  };
  const handleTacticChange = useCallback((id: string, tactic: string) => setBoutTactic(id, tactic as any), [setBoutTactic]);
  const confirmEndBasho = () => { setShowEndBashoConfirm(false); endBasho(); navigate({ to: "/" }); };

  if (!world || !bashoDigest) return null;

  const { bashoName, day, matches, standings, playerRikishiIds, completedBouts, dayProgress, seasonalFlavor } = bashoDigest;
  const bashoInfo = BASHO_CALENDAR[bashoName as keyof typeof BASHO_CALENDAR];
  const dayInfo = getDayName(day);
  const remainingBouts = matches.length - completedBouts;
  const nextBoutIndex = matches.findIndex((m: any) => !m.result);

  return (
    <AppLayout pageTitle={bashoInfo?.nameEn || "Tournament"} subNavTabs={TOURNAMENT_TABS} activeSubTab="basho">
      <Helmet><title>{`${bashoInfo?.nameEn || "Tournament"} Day ${day}`}</title></Helmet>

      <div className="space-y-4">
        {/* ═══════════ DAY HEADER ═══════════ */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{bashoInfo?.nameJa ?? "Basho"}</h1>
              <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                Day {day}/{getTotalBashodays("makuuchi")}
              </Badge>
              {isKeyDay(day) && (
                <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">Key Day</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dayInfo?.dayJa ?? `Day ${day}`} · {bashoInfo?.location ?? "—"} · {completedBouts}/{matches.length} bouts complete
            </p>
            {seasonalFlavor && (
              <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                {seasonalFlavor}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleSimulateNext} disabled={remainingBouts === 0 || nextBoutIndex < 0} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Next Bout
            </Button>
            <Button size="sm" variant="outline" onClick={handleSimulateAll} disabled={remainingBouts === 0} className="gap-1.5">
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
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showScheduleOverview ? "rotate-180" : ""}`} />
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
                {standings.map((entry: any, idx: number) => {
                  const rid = entry?.rikishi?.id as string | undefined;
                  const isPlayer = !!rid && playerRikishiIds.includes(rid);
                  return (
                    <div
                      key={rid ?? `l-${idx}`}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded-md text-xs transition-colors ${
                        isPlayer ? "bg-primary/10 text-primary font-semibold" : idx % 2 === 0 ? "bg-muted/30" : ""
                      }`}
                    >
                      <span className="w-4 text-muted-foreground text-right shrink-0">
                        {idx === 0 ? <Crown className="h-3 w-3 text-gold inline" /> : `${idx + 1}`}
                      </span>
                      {isPlayer && <Star className="h-2.5 w-2.5 shrink-0" fill="currentColor" />}
                      <span className="flex-1 font-display truncate">{entry?.rikishi?.shikona ?? "—"}</span>
                      <span className="font-mono shrink-0">{entry?.wins ?? 0}-{entry?.losses ?? 0}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Match viewer */}
          <div className="lg:col-span-3 lg:order-1 space-y-3">
            <MatchDayViewer
              matches={matches as any}
              world={world}
              playerRikishiIds={new Set(playerRikishiIds)}
              onSimulateBout={simulateBout}
              onSimulateAll={simulateAllBouts}
              onTacticChange={handleTacticChange}
              onEndDay={handleNextDay}
              highlightRikishiId={(state as any).selectedRikishiId || undefined}
              playerTactics={(state as any).boutTactics}
              onBoutClick={(match: any) => {
                if (!match.result || !match.eastRikishi || !match.westRikishi) return;
                setSelectedBout({ 
                  east: match.eastRikishi, 
                  west: match.westRikishi, 
                  result: match.result, 
                  isPlayerBout: match.isPlayerBout 
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedBout && (
        <BoutNarrativeModal
          open={!!selectedBout}
          onOpenChange={(open) => !open && setSelectedBout(null)}
          east={selectedBout.east} west={selectedBout.west}
          result={selectedBout.result} bashoName={(bashoName as any)} day={day}
        />
      )}
      {autoShowPlayerBout && !selectedBout && (
        <BoutNarrativeModal
          open={!!autoShowPlayerBout}
          onOpenChange={(open) => !open && setAutoShowPlayerBout(null)}
          east={autoShowPlayerBout.east} west={autoShowPlayerBout.west}
          result={autoShowPlayerBout.result} bashoName={(bashoName as any)} day={day}
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
