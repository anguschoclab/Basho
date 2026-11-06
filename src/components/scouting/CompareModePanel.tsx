// CompareModePanel.tsx — side-by-side rikishi comparison with a simulated
// best-of-3 "trial clash". Sections live in ./CompareModePanelSections.tsx.

import { useState } from "react";
import { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types/rikishi";
import { resolveBoutParticipant } from "@/presenters/worldAccess";
import { Button } from "@/components/ui/button";
import { simulateBout } from "@/presenters/engineAccess";
import { useGame } from "@/state/game/useGame";
import { projectPublicInjuryAvailability } from "@/presenters/rikishi/transformers/publicInjury";
import {
  CompareRikishiHeader,
  CompareStats,
  CompareInjuryAvailability,
  TrialClashSection,
} from "@/components/scouting/CompareModePanelSections";

interface CompareModePanelProps {
  rikishiA: UIRikishi;
  rikishiB: UIRikishi;
  onClose?: () => void;
}

/** Simulates a best-of-3 trial clash; missing rikishi count as no wins. */
function runBestOfThree(a: Rikishi, b: Rikishi) {
  let winsA = 0;
  let winsB = 0;
  for (let i = 0; i < 3; i++) {
    const res = simulateBout(a, b, `compare-${a.id}-vs-${b.id}-${i}`);
    if (res.result.winner === "east") winsA++;
    else winsB++;
  }
  return { winsA, winsB };
}

export function CompareModePanel({ rikishiA, rikishiB, onClose }: CompareModePanelProps) {
  const { state } = useGame();
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<{ winner: "A" | "B"; score: string } | null>(null);
  const [simUnavailable, setSimUnavailable] = useState(false);

  const runTrialClash = () => {
    const world = state.world;
    if (!world) return;
    setIsSimulating(true);
    // Short delay for "simulation feel"
    setTimeout(() => {
      const a = resolveBoutParticipant(world, rikishiA);
      const b = resolveBoutParticipant(world, rikishiB);
      if (!a || !b) {
        setSimUnavailable(true);
        setIsSimulating(false);
        return;
      }
      const { winsA, winsB } = runBestOfThree(a, b);

      setResults({
        winner: winsA > winsB ? "A" : "B",
        score: `${winsA} - ${winsB}`,
      });
      setIsSimulating(false);
    }, 600);
  };

  // Public injury/availability — resolved from the raw record (or honest
  // "No public record" for unscouted prospects); presence is always public.
  const availabilityA = projectPublicInjuryAvailability(
    state.world?.rikishi.get(rikishiA.id),
    state.world
  );
  const availabilityB = projectPublicInjuryAvailability(
    state.world?.rikishi.get(rikishiB.id),
    state.world
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <CompareRikishiHeader rikishi={rikishiA} highlight={false} availability={availabilityA} />
        <CompareRikishiHeader rikishi={rikishiB} highlight={true} availability={availabilityB} />
      </div>

      {/* Comparison Stats */}
      <CompareStats world={state.world} rikishiA={rikishiA} rikishiB={rikishiB} />

      {/* Injury & Availability — always-public surface */}
      <CompareInjuryAvailability availabilityA={availabilityA} availabilityB={availabilityB} />

      {/* Trial Clash Action */}
      <TrialClashSection
        rikishiA={rikishiA}
        rikishiB={rikishiB}
        isSimulating={isSimulating}
        results={results}
        unavailable={simUnavailable}
        onRun={runTrialClash}
        onReset={() => setResults(null)}
      />

      {onClose && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
            Close Comparison
          </Button>
        </div>
      )}
    </div>
  );
}
