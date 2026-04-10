// AutoSimControls.tsx
// Auto-Sim Controls - UI for auto-simulation and observer modes
// Per Constitution §7: Auto-Sim "Watch the World" Mode

import React, { useState, useMemo } from "react";
import { Play, Eye, Clock, Trophy, AlertTriangle, Star, TrendingUp, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

import type { SimDuration, StopCondition, VerbosityLevel, AutoSimConfig, AutoSimResult } from "@/engine/autoSim";
import { clampInt } from "@/presenters/uiDigest";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RikishiName } from "@/components/ClickableName";

/** Defines the structure for auto sim controls props. */
interface AutoSimControlsProps {
  onStartSim: (config: AutoSimConfig) => Promise<AutoSimResult>;
  isSimulating: boolean;
  playerHeyaId?: string;
}

const DURATION_TYPES = ["days", "weeks", "basho", "years"] as const;
type DurationType = (typeof DURATION_TYPES)[number];

function safeNumber(n: any, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export function AutoSimControls({ onStartSim, isSimulating, playerHeyaId }: AutoSimControlsProps) {
  const { tickMultipleDays } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncSimulating, setIsSyncSimulating] = useState(false);

  const [durationType, setDurationType] = useState<DurationType>("basho");
  const [durationCount, setDurationCount] = useState<number>(1);
  const [verbosity, setVerbosity] = useState<VerbosityLevel>("standard");

  const forcedObserver = !playerHeyaId;
  const [observerMode, setObserverMode] = useState<boolean>(forcedObserver);

  const [stopOnYusho, setStopOnYusho] = useState(false);
  const [stopOnPromotion, setStopOnPromotion] = useState(false);
  const [stopOnInjury, setStopOnInjury] = useState(false);

  const [result, setResult] = useState<AutoSimResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useMemo(() => {
    if (forcedObserver) setObserverMode(true);
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
      const totalDays = durationType === "days" ? durationCount : durationType === "weeks" ? durationCount * 7 : 0;
      
      if (totalDays > 0 && totalDays <= 30 && stopConditions.length === 1 && stopConditions[0] === "never") {
        setIsSyncSimulating(true);
        setTimeout(() => {
          tickMultipleDays(totalDays);
          setIsSyncSimulating(false);
          setIsOpen(false);
        }, 10);
        return;
      }

      const simResult = await onStartSim(config);
      setResult(simResult);
      setShowResult(true);
      setIsOpen(false);
    } catch (e: any) {
      setError(e?.message || "Auto-simulation failed.");
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
          <Button data-testid="watch-the-world" variant="outline" className="gap-2">
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
                    {["1", "2", "3", "5", "10", "25", "50"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Detail Level</Label>
              <Select value={verbosity} onValueChange={(v) => setVerbosity(v as VerbosityLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal — Results only</SelectItem>
                  <SelectItem value="standard">Standard — Key events</SelectItem>
                  <SelectItem value="detailed">Detailed — Full chronicle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Stop Conditions</Label>
              <div className="space-y-2">
                {playerHeyaId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-gold" />Your stable wins yusho</div>
                    <Switch checked={stopOnYusho} onCheckedChange={setStopOnYusho} />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm"><Star className="h-4 w-4 text-primary" />Yokozuna / Ozeki promotion</div>
                  <Switch checked={stopOnPromotion} onCheckedChange={setStopOnPromotion} />
                </div>
                {playerHeyaId && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" />Major injury to your wrestler</div>
                    <Switch checked={stopOnInjury} onCheckedChange={setStopOnInjury} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <div>
                <div className="font-medium text-sm">Observer Mode</div>
                <div className="text-xs text-muted-foreground">{forcedObserver ? "Watching only." : "Watch while your stable runs in background."}</div>
              </div>
              <Switch checked={forcedObserver ? true : observerMode} onCheckedChange={setObserverMode} disabled={forcedObserver} />
            </div>

            {error && <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive border border-destructive/20">{error}</div>}

            {isSyncSimulating && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm font-medium">Batch Processing...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSimulating}>Cancel</Button>
            <Button onClick={handleStartSim} disabled={isSimulating} className="gap-2">
              {isSimulating ? <><Clock className="h-4 w-4 animate-spin" />Simulating…</> : <><Play className="h-4 w-4" />Start Simulation</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-gold" />Simulation Complete</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary/50 text-center"><div className="text-2xl font-bold">{bashoSimulated}</div><div className="text-xs text-muted-foreground">Basho</div></div>
              <div className="p-3 rounded-lg bg-secondary/50 text-center"><div className="text-2xl font-bold">{yearsElapsed}</div><div className="text-xs text-muted-foreground">Years</div></div>
            </div>
            {highlights.length > 0 && (
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Highlights</CardTitle></CardHeader>
                <CardContent><ScrollArea className="h-32"><div className="space-y-1">{highlights.map((h, i) => <div key={i} className="text-sm text-muted-foreground">{h}</div>)}</div></ScrollArea></CardContent>
              </Card>
            )}
            {topChampions.length > 0 && (
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Champions</CardTitle></CardHeader>
                <CardContent><div className="space-y-2">{topChampions.map((c, i) => <div key={i} className="flex items-center justify-between text-sm"><RikishiName id={c.rikishiId} name={c.shikona} /> <Badge variant="outline">{c.yushoCount} yusho</Badge></div>)}</div></CardContent>
              </Card>
            )}
          </div>
          <DialogFooter><Button onClick={() => setShowResult(false)}>Continue</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
