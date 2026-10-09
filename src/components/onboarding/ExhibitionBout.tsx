/**
 * ExhibitionBout.tsx — Onboarding exhibition bout preview.
 * Simulates a single bout from the generated world and plays through it
 * with step-by-step PbP log entries and MentorOverlay tooltips.
 * State lives in useExhibitionBout; sections in ./ExhibitionBoutSections.tsx.
 */

import { MentorOverlay } from "./MentorOverlay";
import { useExhibitionBout } from "@/hooks/useExhibitionBout";
import {
  ExhibitionHeader,
  ExhibitionPbpLog,
  ExhibitionResultBanner,
  ExhibitionWhatsNext,
  ExhibitionControls,
} from "./ExhibitionBoutSections";

interface ExhibitionBoutProps {
  onComplete: () => void;
}

export function ExhibitionBout({ onComplete }: ExhibitionBoutProps) {
  const {
    world,
    pair,
    boutResult,
    logLines,
    revealedCount,
    isFullyRevealed,
    mentorStepIdx,
    currentMentorStep,
    mentorStepCount,
    handleNextLine,
    handleMentorDismiss,
    handleMentorNext,
    handleFinish,
  } = useExhibitionBout(onComplete);

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
      {/* Header + matchup */}
      <ExhibitionHeader east={east} west={west} />

      {/* PbP log */}
      <ExhibitionPbpLog logLines={logLines} revealedCount={revealedCount} />

      {/* Result banner — shown once fully revealed */}
      {isFullyRevealed && (
        <ExhibitionResultBanner
          world={world}
          boutResult={boutResult}
          winnerRikishi={winnerRikishi}
          loserRikishi={loserRikishi}
        />
      )}

      {/* What's Next — shown once fully revealed */}
      {isFullyRevealed && <ExhibitionWhatsNext />}

      {/* Controls */}
      <ExhibitionControls
        revealedCount={revealedCount}
        totalLines={logLines.length}
        isFullyRevealed={isFullyRevealed}
        onNext={handleNextLine}
        onFinish={handleFinish}
      />

      {/* Mentor overlay */}
      {isFullyRevealed || revealedCount > 2 ? null : (
        <MentorOverlay
          step={currentMentorStep}
          stepIndex={mentorStepIdx}
          totalSteps={mentorStepCount}
          onNext={handleMentorNext}
          onDismiss={handleMentorDismiss}
        />
      )}
    </div>
  );
}
