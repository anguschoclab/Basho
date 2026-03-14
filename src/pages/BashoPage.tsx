// BashoPage.tsx — Redesigned Tournament Page
// Clean layout with prominent day controls, better standings, and bout cards

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
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
import { BASHO_CALENDAR, getDayName, getSeasonalFlavor, isKeyDay } from "@/engine/calendar";
import { getTotalBashodays, needsScheduleForDay, DEFAULT_DIVISION_DAYS } from "@/engine/schedule";
import { BoutNarrativeModal } from "@/components/game/BoutNarrativeModal";
import { MatchDayViewer } from "@/components/game/MatchDayViewer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, FastForward, ChevronRight, Trophy, Star, Crown, Calendar, ChevronDown } from "lucide-react";
import type { Rikishi, BoutResult, Division } from "@/engine/types";

/** Type representing match like. */
type MatchLike = {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: BoutResult;
};

/** Defines the structure for selected bout. */
interface SelectedBout {
  east: Rikishi;
  west: Rikishi;
  result: BoutResult;
  isPlayerBout: boolean;
}

/**
 * Make pair key.
 *  * @param a - The A.
 *  * @param b - The B.
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
 *  * @param { currentDay } - The { current day }.
 */
function ScheduleOverview({ currentDay }: ScheduleOverviewProps) {
  const divisions: Division[] = ["makuuchi", "juryo", "makushita", "sandanme", "jonidan", "jonokuchi"];
  
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
  const { state, simulateBout, simulateAllBouts, advanceDay, endBasho, getCurrentDayMatches, getStandings } = useGame();
  const { world, playerHeyaId } = state;

  const [selectedBout, setSelectedBout] = useState<SelectedBout | null>(null);
  const [autoShowPlayerBout, setAutoShowPlayerBout] = useState<SelectedBout | null>(null);
  const [showEndBashoConfirm, setShowEndBashoConfirm] = useState(false);
  const [showScheduleOverview, setShowScheduleOverview] = useState(false);
  const lastAutoShownKeyRef = useRef<string | null>(null);

  const basho = world?.currentBasho ?? null;
  const bashoInfo = basho ? BASHO_CALENDAR[basho.bashoName] : null;
  const dayInfo = basho ? getDayName(basho.day) : null;

  const matches = (getCurrentDayMatches?.() as unknown as MatchLike[]) ?? [];
  const standings = (getStandings?.() ?? []).slice(0, 10);

  const playerRikishiIds = useMemo(() => {
    if (!playerHeyaId || !world) return new Set<string>();
    const heya = world.heyas.get(playerHeyaId);
    return new Set(heya?.rikishiIds ?? []);
  }, [playerHeyaId, world]);

  const resolveRikishi = useCallback(
    (id: string): Rikishi | null => world?.rikishi.get(id) ?? null,
    [world]
  );

  const isPlayerBout = useCallback(
    (m: MatchLike) => playerRikishiIds.has(m.eastRikishiId) || playerRikishiIds.has(m.westRikishiId),
    [playerRikishiIds]
  );

  const nextBoutIndex = useMemo(() => matches.findIndex((m) => !m.result), [matches]);
  const completedBouts = useMemo(() => matches.reduce((count, m) => count + (m.result ? 1 : 0), 0), [matches]);
  const remainingBouts = matches.length - completedBouts;
  const dayProgress = matches.length > 0 ? (completedBouts / matches.length) * 100 : 0;

  // Auto-show player bout
  const lastBoutKey = useMemo(() => {
    const last = (state as any).lastBoutResult as BoutResult | undefined;
    if (!last) return null;
    const w = (last as any).winnerRikishiId;
    const l = (last as any).loserRikishiId;
    if (typeof w !== "string" || typeof l !== "string") return null;
    const km = typeof (last as any).kimariteId === "string" ? (last as any).kimariteId : "";
    return `${makePairKey(w, l)}::${basho?.day ?? 0}::${km}`;
  }, [(state as any).lastBoutResult, basho?.day]);

  useEffect(() => {
    if (state.phase === "basho_recap") { navigate("/recap"); return; }
    if (state.phase === "basho_results") { navigate("/recap"); return; }
    if (!world?.currentBasho) navigate("/");
  }, [world, navigate, state.phase]);

  useEffect(() => {
    const last = (state as any).lastBoutResult as BoutResult | undefined;
    if (!last || !lastBoutKey || lastAutoShownKeyRef.current === lastBoutKey || selectedBout) return;
    const winnerId = (last as any).winnerRikishiId;
    const loserId = (last as any).loserRikishiId;
    if (typeof winnerId !== "string" || typeof loserId !== "string") return;
    const winner = resolveRikishi(winnerId);
    const loser = resolveRikishi(loserId);
    if (!winner || !loser) return;
    if (!playerRikishiIds.has(winner.id) && !playerRikishiIds.has(loser.id)) return;
    const matchToday = matches.find(m =>
      (m.eastRikishiId === winner.id && m.westRikishiId === loser.id) ||
      (m.eastRikishiId === loser.id && m.westRikishiId === winner.id)
    );
    const east = matchToday ? resolveRikishi(matchToday.eastRikishiId) : winner;
    const west = matchToday ? resolveRikishi(matchToday.westRikishiId) : loser;
    if (east && west) {
      setAutoShowPlayerBout({ east, west, result: last, isPlayerBout: true });
      lastAutoShownKeyRef.current = lastBoutKey;
    }
  }, [matches, playerRikishiIds, resolveRikishi, selectedBout, state, lastBoutKey]);

  const handleSimulateNext = () => { if (nextBoutIndex >= 0) simulateBout(nextBoutIndex); };
  const handleSimulateAll = () => { simulateAllBouts(); };
  const handleNextDay = () => {
    if (basho.day >= 15) setShowEndBashoConfirm(true);
    else advanceDay();
  };
  const confirmEndBasho = () => { setShowEndBashoConfirm(false); endBasho(); navigate("/"); };

  if (!world || !basho) return null;

  const competitionTabs = [
    { id: "basho", label: "Basho" },
    { id: "banzuke", label: "Banzuke", href: "/banzuke" },
    { id: "rivalries", label: "Rivalries", href: "/rivalries" },
  ];

  return (
    <AppLayout pageTitle={bashoInfo?.nameEn || "Tournament"} subNavTabs={competitionTabs} activeSubTab="basho">
      <Helmet><title>{`${bashoInfo?.nameEn || "Tournament"} Day ${basho.day}`}</title></Helmet>

      <div className="space-y-4">
        {/* ═══════════ DAY HEADER ═══════════ */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold">{bashoInfo?.nameJa ?? "Basho"}</h1>
              <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                Day {basho.day}/{getTotalBashodays("makuuchi")}
              </Badge>
              {isKeyDay(basho.day) && (
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-xs">Key Day</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dayInfo?.dayJa ?? `Day ${basho.day}`} · {bashoInfo?.location ?? "—"} · {completedBouts}/{matches.length} bouts complete
            </p>
            {bashoInfo?.season && (
              <p className="text-xs text-muted-foreground/70 italic mt-0.5">
                {getSeasonalFlavor(bashoInfo.season, world?.seed)}
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
              <Button size="sm" onClick={handleNextDay} className="gap-1.5">
                {basho.day >= 15 ? "End Basho" : "Next Day"} <ChevronRight className="h-3.5 w-3.5" />
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
                  <ScheduleOverview currentDay={basho.day} />
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
                  const isPlayer = !!rid && playerRikishiIds.has(rid);
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
              matches={matches}
              world={world}
              playerRikishiIds={playerRikishiIds}
              onBoutClick={(match) => {
                if (!match.result) return;
                const east = resolveRikishi(match.eastRikishiId);
                const west = resolveRikishi(match.westRikishiId);
                if (!east || !west) return;
                setSelectedBout({ east, west, result: match.result, isPlayerBout: isPlayerBout(match) });
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
          result={selectedBout.result} bashoName={basho.bashoName} day={basho.day}
        />
      )}
      {autoShowPlayerBout && !selectedBout && (
        <BoutNarrativeModal
          open={!!autoShowPlayerBout}
          onOpenChange={(open) => !open && setAutoShowPlayerBout(null)}
          east={autoShowPlayerBout.east} west={autoShowPlayerBout.west}
          result={autoShowPlayerBout.result} bashoName={basho.bashoName} day={basho.day}
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
