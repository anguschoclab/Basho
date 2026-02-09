// BoutViewer.tsx
// Demo Bout Viewer (Index page)
// - Deterministic: no seedrandom/Math.random
// - Uses engine simulateBout(east, west, seed)
// - Uses SAMPLE_RIKISHI as a safe demo roster

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RikishiCard } from "./RikishiCard";
import { BoutResultDisplay } from "./BoutResultDisplay";
import { BoutLog } from "./BoutLog";
import { simulateBout } from "@/engine/bout";
import { SAMPLE_RIKISHI } from "@/engine/mockData";
import type { Rikishi, BoutResult } from "@/engine/types";
import { Swords, RotateCcw, Shuffle } from "lucide-react";
import { rngFromSeed } from "@/engine/rng";

interface BoutViewerProps {
  className?: string;
  seed?: string;
}

function safeRoster(): Rikishi[] {
  return Array.isArray(SAMPLE_RIKISHI) ? SAMPLE_RIKISHI.filter(Boolean) as Rikishi[] : [];
}

function pickPair(roster: Rikishi[], seed: string): { east: Rikishi; west: Rikishi } | null {
  if (roster.length < 2) return null;
  const rng = rngFromSeed(seed || "demo", "ui", "boutViewer::pick");
  const a = rng.int(0, roster.length - 1);
  let b = rng.int(0, roster.length - 1);
  if (b === a) b = (b + 1) % roster.length;
  return { east: roster[a], west: roster[b] };
}

export function BoutViewer({ className, seed = "demo" }: BoutViewerProps) {
  const roster = useMemo(() => safeRoster(), []);
  const [salt, setSalt] = useState(0);

  const pair = useMemo(() => pickPair(roster, `${seed}::${salt}`), [roster, seed, salt]);

  const [result, setResult] = useState<BoutResult | null>(null);

  const run = () => {
    if (!pair) return;
    const boutSeed = `${seed}::boutViewer::${salt}::${pair.east.id}::${pair.west.id}`;
    const r = simulateBout({ ...pair.east }, { ...pair.west }, boutSeed);
    setResult(r);
  };

  const reshuffle = () => {
    setResult(null);
    setSalt((s) => s + 1);
  };

  if (!pair) {
    return (
      <div className={cn("p-6 text-sm text-muted-foreground", className)}>
        Demo roster not available.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Button onClick={run} className="gap-2">
          <Swords className="h-4 w-4" />
          Simulate Bout
        </Button>
        <Button variant="outline" onClick={reshuffle} className="gap-2">
          <Shuffle className="h-4 w-4" />
          New Pair
        </Button>
        <Button variant="ghost" onClick={() => setResult(null)} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <RikishiCard rikishi={pair.east} side="east" />
        <RikishiCard rikishi={pair.west} side="west" />
      </div>

      {result && (
        <div className="space-y-3">
          <BoutResultDisplay 
            result={result} 
            eastRikishi={pair.east} 
            westRikishi={pair.west} 
          />
          {Array.isArray((result as any).log) && (result as any).log.length > 0 && (
            <BoutLog log={(result as any).log} />
          )}
        </div>
      )}
    </div>
  );
}
