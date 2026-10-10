// CompareModePanel.tsx — side-by-side rikishi comparison with a simulated
// best-of-3 "trial clash". Sections live in ./CompareModePanelSections.tsx.

import { useState } from "react";
import { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types/rikishi";
import { Button } from "@/components/ui/button";
import { simulateBout } from "@/presenters/engineAccess";
import { useGame } from "@/contexts/useGame";
import { CompareRikishiHeader, CompareStats, TrialClashSection } from "./CompareModePanelSections";

interface CompareModePanelProps {
  rikishiA: UIRikishi;
  rikishiB: UIRikishi;
  onClose?: () => void;
}

/** Simulates a best-of-3 trial clash; missing rikishi count as no wins. */
function runBestOfThree(a: Rikishi | undefined, b: Rikishi | undefined) {
  let winsA = 0;
  let winsB = 0;
  if (!a || !b) return { winsA, winsB };
  for (let i = 0; i < 3; i++) {
    const res = simulateBout(a, b, `compare-${Date.now()}-${i}`);
    if (res.result.winner === "east") winsA++;
    else winsB++;
  }
  return { winsA, winsB };
}

export function CompareModePanel({ rikishiA, rikishiB, onClose }: CompareModePanelProps) {
  const { state } = useGame();
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<{ winner: "A" | "B"; score: string } | null>(null);

  const runTrialClash = () => {
    if (!state.world) return;
    setIsSimulating(true);
    // Short delay for "simulation feel"
    setTimeout(() => {
      const { winsA, winsB } = runBestOfThree(
        state.world?.rikishi.get(rikishiA.id),
        state.world?.rikishi.get(rikishiB.id)
      );

      setResults({
        winner: winsA > winsB ? "A" : "B",
        score: `${winsA} - ${winsB}`,
      });
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <CompareRikishiHeader rikishi={rikishiA} highlight={false} />
        <CompareRikishiHeader rikishi={rikishiB} highlight={true} />
      </div>

      {/* Comparison Stats */}
      <CompareStats world={state.world} rikishiA={rikishiA} rikishiB={rikishiB} />

      {/* Trial Clash Action */}
      <TrialClashSection
        rikishiA={rikishiA}
        rikishiB={rikishiB}
        isSimulating={isSimulating}
        results={results}
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
