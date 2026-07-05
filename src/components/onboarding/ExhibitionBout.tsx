/**
 * ExhibitionBout.tsx — Onboarding exhibition bout preview.
 * Simulates a single bout from the generated world and plays through it
 * with step-by-step PbP log entries and MentorOverlay tooltips.
 */

import { useState, useMemo, useCallback } from "react";
import { useGame } from "@/contexts/GameContext";
import { resolveBout } from "@/engine/bout/boutResolver";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { BashoState } from "@/engine/types/basho";
import type { BoutResult } from "@/engine/types/basho";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Swords, Trophy } from "lucide-react";
import { MentorOverlay, type MentorStep } from "./MentorOverlay";
import { PbpLineText } from "@/components/game/PbpLineText";
import { KimariteTag } from "@/components/ui/KimariteTag";
import { cn } from "@/lib/utils";

const MENTOR_SEQUENCE: MentorStep[] = ["stamina", "grip", "momentum", "basho_record"];

/** Picks two makuuchi rikishi from the world to fight. */
function pickExhibitionPair(world: import("@/engine/types/world").WorldState) {
  const candidates = [];
  // ⚡ Bolt Optimization: Replace O(N) Array.from().filter() with early-exit loop
  for (const r of world.rikishi.values()) {
    if (r.division === "makuuchi" || r.division === "juryo") {
      candidates.push(r);
      if (candidates.length === 2) break;
    }
  }

  if (candidates.length < 2) {
    // Fallback: any two rikishi
    const fallback = [];
    for (const r of world.rikishi.values()) {
      fallback.push(r);
      if (fallback.length === 2) break;
    }
    return fallback.length >= 2 ? ([fallback[0], fallback[1]] as const) : null;
  }
  return [candidates[0], candidates[1]] as const;
}

interface ExhibitionBoutProps {
  onComplete: () => void;
}

export function ExhibitionBout({ onComplete }: ExhibitionBoutProps) {
  const { state, advanceTutorialStep, setTutorialFlag, completeTutorial } = useGame();
  const world = state.world;

  const pair = useMemo(() => (world ? pickExhibitionPair(world) : null), [world]);

  // Resolve bout once, deterministically, on mount
  const boutResult = useMemo<BoutResult | null>(() => {
    if (!pair || !world) return null;
    const [east, west] = pair;

    const ctx: BoutContext = {
      id: "exhibition-bout-001",
      day: 1,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    };

    const mockBasho: BashoState = {
      year: world.year,
      bashoNumber: 1,
      bashoName: "hatsu",
      day: 1,
      matches: [],
      standings: new Map(),
      schedule: [],
      results: [],
      name: "hatsu",
    } as unknown as BashoState;

    try {
      const resolved = resolveBout(ctx, east, west, mockBasho);
      return resolved?.result ?? null;
    } catch {
      return null;
    }
  }, [pair, world]);

  const [revealedCount, setRevealedCount] = useState(0);
  const [mentorStepIdx, setMentorStepIdx] = useState(0);
  const [mentorDismissed, setMentorDismissed] = useState(false);

  const logLines = boutResult?.pbpLines ?? [];
  const isFullyRevealed = revealedCount >= logLines.length;
  const currentMentorStep: MentorStep =
    !mentorDismissed && mentorStepIdx < MENTOR_SEQUENCE.length
      ? MENTOR_SEQUENCE[mentorStepIdx]
      : null;

  const handleNextLine = useCallback(() => {
    if (!isFullyRevealed) {
      setRevealedCount((c) => c + 1);
    }
  }, [isFullyRevealed]);

  const handleMentorDismiss = useCallback(() => {
    setMentorDismissed(true);
    setTutorialFlag("seenBashoRecordTooltip");
  }, [setTutorialFlag]);

  const handleMentorNext = useCallback(() => {
    if (mentorStepIdx < MENTOR_SEQUENCE.length - 1) {
      const flagMap: Record<string, keyof import("@/engine/types/tutorial").TutorialFlags> = {
        stamina: "seenStaminaTooltip",
        grip: "seenGripTooltip",
        momentum: "seenMomentumTooltip",
        basho_record: "seenBashoRecordTooltip",
      };
      const current = MENTOR_SEQUENCE[mentorStepIdx];
      if (current && flagMap[current]) setTutorialFlag(flagMap[current]);
      setMentorStepIdx((i) => i + 1);
    } else {
      handleMentorDismiss();
    }
  }, [mentorStepIdx, setTutorialFlag, handleMentorDismiss]);

  const handleFinish = useCallback(() => {
    setTutorialFlag("finishedExhibition");
    advanceTutorialStep("FIRST_BASHO_STARTED");
    completeTutorial();
    onComplete();
  }, [setTutorialFlag, advanceTutorialStep, completeTutorial, onComplete]);

  if (!world || !pair || !boutResult) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
        <p className="text-sm">Preparing exhibition bout...</p>
      </div>
    );
  }

  const [east, west] = pair;
  const winnerRikishi = boutResult.winner === "east" ? east : west;
  const loserRikishi = boutResult.winner === "east" ? west : east;

  return (
    <div className="relative flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Exhibition Bout — Preseason Demonstration
        </p>
        <h2 className="text-3xl font-display font-black uppercase tracking-tight">
          Live Bout Preview
        </h2>
      </div>

      {/* Rikishi matchup */}
      <div className="flex items-center gap-4">
        <div className="flex-1 text-center">
          <div className="text-lg font-display font-black uppercase">
            {east.shikona ?? east.name}
          </div>
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-1">
            {east.rank}
          </Badge>
        </div>
        <div className="shrink-0">
          <Swords className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg font-display font-black uppercase">
            {west.shikona ?? west.name}
          </div>
          <Badge variant="outline" className="text-[9px] uppercase tracking-wider mt-1">
            {west.rank}
          </Badge>
        </div>
      </div>

      {/* PbP log */}
      <div className="bg-muted/30 rounded-lg border border-border/40 p-4 min-h-[220px] space-y-2 overflow-y-auto max-h-[280px] custom-scrollbar">
        {logLines.slice(0, revealedCount).map((line, i) => (
          <div
            key={i}
            className={cn(
              "text-sm leading-relaxed animate-in fade-in slide-in-from-left-3 duration-400",
              i === revealedCount - 1 ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            <PbpLineText text={typeof line === "string" ? line : line.text} />
          </div>
        ))}
        {revealedCount === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Press "Next" to watch the bout unfold...
          </p>
        )}
      </div>

      {/* Result banner — shown once fully revealed */}
      {isFullyRevealed && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in fade-in duration-500">
          <Trophy className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Result</p>
            <p className="font-display font-black text-lg uppercase">
              {winnerRikishi.shikona ?? winnerRikishi.name} wins by{" "}
              <KimariteTag
                kimariteId={boutResult.kimarite}
                kimariteName={boutResult.kimariteName}
              />
            </p>
            <p className="text-xs text-muted-foreground">
              {loserRikishi.shikona ?? loserRikishi.name} defeated
            </p>
          </div>
        </div>
      )}

      {/* What's Next — shown once fully revealed */}
      {isFullyRevealed && (
        <div className="glass rounded-lg p-6 border border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h3 className="font-display font-black text-lg uppercase tracking-tight mb-3">
            Your Role as Oyakata
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Manage training regimens and sparring partnerships</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Navigate basho (tournament) schedules across 6 Grand Tournaments</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Balance finances, sponsors, and facilities</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Participate in JSA governance and ichimon politics</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Scout recruits and develop the next generation</span>
            </li>
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          {revealedCount}/{logLines.length} actions
        </p>
        {!isFullyRevealed ? (
          <Button
            onClick={handleNextLine}
            className="gap-2 font-display font-black uppercase tracking-wide"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            className="gap-2 font-display font-black uppercase tracking-wide bg-primary"
          >
            Begin My Career
          </Button>
        )}
      </div>

      {/* Mentor overlay */}
      {isFullyRevealed || revealedCount > 2 ? null : (
        <MentorOverlay
          step={currentMentorStep}
          stepIndex={mentorStepIdx}
          totalSteps={MENTOR_SEQUENCE.length}
          onNext={handleMentorNext}
          onDismiss={handleMentorDismiss}
        />
      )}
    </div>
  );
}
