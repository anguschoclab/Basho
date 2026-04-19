import React, { useState } from "react";
import { UIRikishi } from "@/presenters/uiModels";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sword, RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { simulateBout } from "@/engine/bout/boutResolver";
import { useGame } from "@/contexts/GameContext";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { cn } from "@/lib/utils";

interface CompareModePanelProps {
  rikishiA: UIRikishi;
  rikishiB: UIRikishi;
  onClose?: () => void;
}

export function CompareModePanel({ rikishiA, rikishiB, onClose }: CompareModePanelProps) {
  const { state } = useGame();
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<{ winner: "A" | "B"; score: string } | null>(null);

  const runTrialClash = () => {
    setIsSimulating(true);
    // Short delay for "simulation feel"
    setTimeout(() => {
      let winsA = 0;
      let winsB = 0;

      // Best of 3
      for (let i = 0; i < 3; i++) {
        const fullA = state.world.rikishi.find((r) => r.id === rikishiA.id);
        const fullB = state.world.rikishi.find((r) => r.id === rikishiB.id);
        if (fullA && fullB) {
          const res = simulateBout(fullA, fullB, `compare-${Date.now()}-${i}`);
          if (res.winner === "east") winsA++;
          else winsB++;
        }
      }

      setResults({
        winner: winsA > winsB ? "A" : "B",
        score: `${winsA} - ${winsB}`,
      });
      setIsSimulating(false);
    }, 600);
  };

  const renderStatRow = (label: string, valA: number, valB: number) => {
    const diff = valA - valB;
    return (
      <div className="group flex items-center justify-between py-2 border-b border-primary/5 last:border-0">
        <div className="w-16 text-right font-display font-bold text-lg">{valA}</div>

        <div className="flex flex-col items-center gap-1 flex-1 px-4">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-center w-full">
            {label}
          </span>
          <div className="flex items-center gap-1">
            {diff > 0 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : diff < 0 ? (
              <TrendingDown className="h-3 w-3 text-destructive" />
            ) : (
              <Minus className="h-3 w-3 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-[10px] font-mono font-bold",
                diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {diff > 0 ? `+${diff}` : diff === 0 ? "EQUAL" : diff}
            </span>
          </div>
        </div>

        <div className="w-16 text-left font-display font-bold text-lg text-primary">{valB}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-2 gap-4">
        {/* Rikishi A Header */}
        <div className="text-center space-y-2 p-4 rounded-xl bg-muted/20 border border-primary/10">
          <SumoAvatar
            config={rikishiA.avatarConfig}
            size="lg"
            className="mx-auto"
            expression="neutral"
          />
          <h3 className="font-display font-bold text-lg">{rikishiA.shikona}</h3>
          <Badge variant="outline" className="bg-primary/5">
            {rikishiA.rankLabel}
          </Badge>
        </div>

        {/* Rikishi B Header */}
        <div className="text-center space-y-2 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <SumoAvatar
            config={rikishiB.avatarConfig}
            size="lg"
            className="mx-auto"
            expression="neutral"
          />
          <h3 className="font-display font-bold text-lg text-primary">{rikishiB.shikona}</h3>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {rikishiB.rankLabel}
          </Badge>
        </div>
      </div>

      {/* Comparison Stats */}
      <Card className="bg-background/40 backdrop-blur shadow-xl overflow-hidden border-primary/10">
        <CardContent className="p-6">
          {(() => {
            const rawA = state.world.rikishi.find((r) => r.id === rikishiA.id);
            const rawB = state.world.rikishi.find((r) => r.id === rikishiB.id);

            if (!rawA || !rawB)
              return <p className="text-center text-muted-foreground">Stats unavailable</p>;

            return (
              <div className="space-y-2">
                {renderStatRow("Strength", rawA.power, rawB.power)}
                {renderStatRow("Speed", rawA.speed, rawB.speed)}
                {renderStatRow("Balance", rawA.balance, rawB.balance)}
                {renderStatRow("Technique", rawA.technique, rawB.technique)}
                {renderStatRow("Stamina", rawA.stamina, rawB.stamina)}
                {renderStatRow("Spirit", rawA.mental, rawB.mental)}
                {renderStatRow("Weight", rawA.weight, rawB.weight)}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Trial Clash Action */}
      <div className="flex flex-col items-center gap-4 py-4">
        {!results && !isSimulating && (
          <Button
            size="lg"
            className="group h-14 px-12 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-display text-xl rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-all"
            onClick={runTrialClash}
          >
            <Sword className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            Run Trial Clash
          </Button>
        )}

        {isSimulating && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-14 flex items-center gap-3 text-lg font-display animate-pulse">
              <Sword className="h-6 w-6 animate-spin" />
              Simulating Clash...
            </div>
          </div>
        )}

        {results && (
          <div className="w-full flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-8">
              <div
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-1",
                  results.winner === "A"
                    ? "border-success/50 bg-success/10"
                    : "border-muted opacity-50"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">Score</span>
                <span className="text-3xl font-display font-black">
                  {results.score.split(" - ")[0]}
                </span>
              </div>

              <div className="flex flex-col items-center text-center max-w-[200px]">
                <Badge className="bg-success text-success-foreground hover:bg-success/90 mb-2">
                  TRIAL VERDICT
                </Badge>
                <h4 className="font-display font-bold text-xl uppercase tracking-tight">
                  {results.winner === "A" ? rikishiA.shikona : rikishiB.shikona} Wins
                </h4>
              </div>

              <div
                className={cn(
                  "p-4 rounded-2xl border-2 flex flex-col items-center gap-1",
                  results.winner === "B"
                    ? "border-primary/50 bg-primary/10"
                    : "border-muted opacity-50"
                )}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">Score</span>
                <span className="text-3xl font-display font-black text-primary">
                  {results.score.split(" - ")[1]}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setResults(null)}
              className="gap-2 rounded-full h-12 px-8 border-primary/20"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Comparison
            </Button>
          </div>
        )}
      </div>

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
