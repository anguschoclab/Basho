// AutoSimControls.tsx
// Auto-Sim Controls - UI for auto-simulation and observer modes
// Per Constitution §7: Auto-Sim "Watch the World" Mode
//
// Fixes:
// - Removes unused imports (CardDescription, DialogTrigger footer extras, Progress, Pause, FastForward, etc.)
// - Uses a safe SimDuration builder with clamping + type narrowing
// - Prevents double-submit while simulating
// - Handles errors from onStartSim gracefully (no blank screen)
// - Observer mode logic: if no playerHeyaId => forced true and locked on
// - Stops conditions: avoid pushing "never" alongside other conditions; only use when none selected
// - Result rendering is null-safe (chronicle fields optional)
// - Year elapsed is clamped (avoid NaN if missing)

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RikishiName } from "@/components/ClickableName";
import { Play, Eye, Clock, Trophy, AlertTriangle, Star, TrendingUp } from "lucide-react";

import type { SimDuration, StopCondition, VerbosityLevel, AutoSimConfig, AutoSimResult } from "@/engine/autoSim";

interface AutoSimControlsProps {
  onStartSim: (config: AutoSimConfig) => Promise<AutoSimResult>;
  isSimulating: boolean;
  playerHeyaId?: string;
}

const DURATION_TYPES = ["days", "weeks", "basho", "years"] as const;
type DurationType = (typeof DURATION_TYPES)[number];

function clampInt(n: number, lo: number, hi: number) {
  const x = Number.isFinite(n) ? Math.trunc(n) : lo;
  return Math.max(lo, Math.min(hi, x));
}

function safeNumber(n: any, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export function AutoSimControls({ onStartSim, isSimulating, playerHeyaId }: AutoSimControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [durationType, setDurationType] = useState<DurationType>("basho");
  const [durationCount, setDurationCount] = useState<number>(1);

  const [verbosity, setVerbosity] = useState<VerbosityLevel>("standard");

  // If no player heya exists, observer mode should always be true.
  const forcedObserver = !playerHeyaId;
  const [observerMode, setObserverMode] = useState<boolean>(forcedObserver);

  const [stopOnYusho, setStopOnYusho] = useState(false);
  const [stopOnPromotion, setStopOnPromotion] = useState(false);
  const [stopOnInjury, setStopOnInjury] = useState(false);

  const [result, setResult] = useState<AutoSimResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Keep observerMode synced if playerHeyaId becomes undefined later.
  useMemo(() => {
    if (forcedObserver) setObserverMode(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedObserver]);

  const handleStartSim = async () => {
    if (isSimulating) return;

    setError(null);

    const stopConditions: StopCondition[] = [];
    if (stopOnYusho && playerHeyaId) stopConditions.push("yusho");
    if (stopOnPromotion) stopConditions.push("yokozunaPromotion", "ozekiPromotion");
    if (stopOnInjury && playerHeyaId) stopConditions.push("majorInjury");
    if (stopConditions.length === 0) stopConditions.push("never");

    const duration: SimDuration = {
      type: durationType,
      count: clampInt(durationCount, 1, 500)
    };

    const config: AutoSimConfig = {
      duration,
      stopConditions,
      verbosity,
      delegationPolicy: "balanced",
      observerMode: forcedObserver ? true : observerMode,
      playerHeyaId: playerHeyaId ?? null
    } as AutoSimConfig;

    try {
      const simResult = await onStartSim(config);
      setResult(simResult);
      setShowResult(true);
      setIsOpen(false);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Auto-simulation failed. Check console for details.";
      setError(msg);
    }
  };

  const yearsElapsed = result
    ? clampInt(safeNumber(result.endYear, 0) - safeNumber(result.startYear, 0), 0, 10_000)
    : 0;

  const bashoSimulated = result ? clampInt(safeNumber((result as any).bashoSimulated, 0), 0, 1_000_000) : 0;

  const chronicle = result?.chronicle as any;
  const highlights: string[] = Array.isArray(chronicle?.highlights) ? chronicle.highlights : [];
  const topChampions: any[] = Array.isArray(chronicle?.topChampions) ? chronicle.topChampions : [];
  const eraLabels: string[] = Array.isArray(chronicle?.eraLabels) ? chronicle.eraLabels : [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Watch the World
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Watch the World
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Duration */}
            <div className="space-y-3">
              <Label>Simulation Duration</Label>
              <div className="flex gap-2">
                <Select value={durationType} onValueChange={(v) => setDurationType(v as DurationType)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="basho">Basho</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={String(durationCount)}
                  onValueChange={(v) => setDurationCount(clampInt(Number(v), 1, 500))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                Deterministic: the same seed + world state yields the same results.
              </div>
            </div>

            {/* Verbosity */}
            <div className="space-y-3">
              <Label>Detail Level</Label>
              <Select value={verbosity} onValueChange={(v) => setVerbosity(v as VerbosityLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal — Results only</SelectItem>
                  <SelectItem value="standard">Standard — Key events</SelectItem>
                  <SelectItem value="detailed">Detailed — Full chronicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stop Conditions */}
            <div className="space-y-3">
              <Label>Stop Conditions</Label>
              <div className="space-y-2">
                {playerHeyaId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      Your stable wins yusho
                    </div>
                    <Switch checked={stopOnYusho} onCheckedChange={setStopOnYusho} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-primary" />
                    Yokozuna / Ozeki promotion
                  </div>
                  <Switch checked={stopOnPromotion} onCheckedChange={setStopOnPromotion} />
                </div>

                {playerHeyaId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Major injury to your wrestler
                    </div>
                    <Switch checked={stopOnInjury} onCheckedChange={setStopOnInjury} />
                  </div>
                )}
              </div>
            </div>

            {/* Observer Mode */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <div className="font-medium text-sm">Observer Mode</div>
                <div className="text-xs text-muted-foreground">
                  {forcedObserver
                    ? "No player stable selected — observer mode is required."
                    : "Watch the world evolve while your stable continues in the background."}
                </div>
              </div>
              <Switch
                checked={forcedObserver ? true : observerMode}
                onCheckedChange={setObserverMode}
                disabled={forcedObserver}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSimulating}>
              Cancel
            </Button>
            <Button onClick={handleStartSim} disabled={isSimulating} className="gap-2">
              {isSimulating ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Simulating…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Simulation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Simulation Complete
            </DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-bold">{bashoSimulated}</div>
                  <div className="text-xs text-muted-foreground">Basho Simulated</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-bold">{yearsElapsed}</div>
                  <div className="text-xs text-muted-foreground">Years Elapsed</div>
                </div>
              </div>

              {typeof (result as any).stoppedBy === "string" && (result as any).stoppedBy !== "completed" && (
                <Badge variant="outline" className="w-full justify-center py-2">
                  Stopped by: {(result as any).stoppedBy}
                </Badge>
              )}

              {/* Chronicle Highlights */}
              {highlights.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Chronicle Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {highlights.slice(0, 10).map((h, i) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            {h}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Top Champions */}
              {topChampions.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Era Champions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {topChampions.slice(0, 5).map((c: any, i: number) => (
                        <div key={`${c?.rikishiId ?? "x"}-${i}`} className="flex items-center justify-between text-sm">
                          <span className="font-display">
                            <RikishiName id={String(c?.rikishiId ?? "")} name={String(c?.shikona ?? "Unknown")} />
                          </span>
                          <Badge variant="outline">{clampInt(safeNumber(c?.yushoCount, 0), 0, 999)} yusho</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Era Labels */}
              {eraLabels.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 text-center">
                  <div className="text-sm font-medium text-primary">{eraLabels[0]}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No result data.</div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResult(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
