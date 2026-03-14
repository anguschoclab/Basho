/**
 * HolidayControls.tsx
 * FM-style Holiday UI — lets the player skip to a time boundary
 * with configurable safety gates and delegation policy.
 * Shows a digest on completion per Constitution §6.3 / A7.2.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palmtree,
  Play,
  AlertTriangle,
  ShieldAlert,
  Trophy,
  Banknote,
  Clock,
  Newspaper,
} from "lucide-react";

import type {
  HolidayConfig,
  HolidayResult,
  HolidayTarget,
  SafetyGate,
  DelegationPolicy,
} from "@/engine/holiday";
import { DEFAULT_CRITICAL_GATES } from "@/engine/holiday";

/** Defines the structure for holiday controls props. */
interface HolidayControlsProps {
  onHoliday: (config: HolidayConfig) => HolidayResult | null;
  playerHeyaId?: string;
  currentPhase: string;
}

const TARGET_OPTIONS: { value: HolidayTarget; label: string; description: string }[] = [
  { value: "nextDay", label: "Next Day", description: "Advance one day" },
  { value: "nextWeek", label: "Next Week", description: "Skip forward 7 days" },
  { value: "nextMonth", label: "Next Month", description: "Skip forward ~30 days" },
  { value: "nextBashoDay1", label: "Next Basho", description: "Skip to the next tournament" },
  { value: "endOfBasho", label: "End of Basho", description: "Fast-forward through the tournament" },
  { value: "postBasho", label: "Post-Basho", description: "Skip past tournament wrap-up" },
];

const DELEGATION_OPTIONS: { value: DelegationPolicy; label: string }[] = [
  { value: "conservative", label: "Conservative — Minimize risk" },
  { value: "balanced", label: "Balanced — Moderate approach" },
  { value: "aggressive", label: "Aggressive — Push for results" },
  { value: "roleplay", label: "Roleplay — Match stable identity" },
];

const GATE_OPTIONS: { value: SafetyGate; label: string; icon: typeof AlertTriangle }[] = [
  { value: "topRikishiInjury", label: "Top wrestler injured", icon: AlertTriangle },
  { value: "insolvencyWarning", label: "Solvency risk", icon: Banknote },
  { value: "scandalSeverity", label: "Major scandal", icon: ShieldAlert },
  { value: "promotionRun", label: "Promotion run", icon: Trophy },
  { value: "loanDefault", label: "Financial emergency", icon: Banknote },
];

/**
 * holiday controls.
 *  * @param { onHoliday, playerHeyaId, currentPhase } - The { on holiday, player heya id, current phase }.
 */
export function HolidayControls({ onHoliday, playerHeyaId, currentPhase }: HolidayControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<HolidayTarget>("nextWeek");
  const [delegation, setDelegation] = useState<DelegationPolicy>("balanced");
  const [activeGates, setActiveGates] = useState<Set<SafetyGate>>(
    new Set(DEFAULT_CRITICAL_GATES)
  );

  const [result, setResult] = useState<HolidayResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const toggleGate = (gate: SafetyGate) => {
    setActiveGates((prev) => {
      const next = new Set(prev);
      if (next.has(gate)) next.delete(gate);
      else next.add(gate);
      return next;
    });
  };

  const handleGo = () => {
    const config: HolidayConfig = {
      target,
      gates: Array.from(activeGates),
      delegationPolicy: delegation,
      playerHeyaId,
    };

    const holidayResult = onHoliday(config);
    if (holidayResult) {
      setResult(holidayResult);
      setIsOpen(false);
      setShowResult(true);
    }
  };

  // Filter targets based on current phase
  const availableTargets = useMemo(() => {
    if (currentPhase === "active_basho") {
      return TARGET_OPTIONS.filter((t) =>
        ["nextDay", "endOfBasho", "postBasho"].includes(t.value)
      );
    }
    return TARGET_OPTIONS;
  }, [currentPhase]);

  return (
    <>
      {/* Holiday Config Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Palmtree className="h-4 w-4" />
            Holiday
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palmtree className="h-5 w-5" />
              Go On Holiday
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Target */}
            <div className="space-y-2">
              <Label>Skip To</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as HolidayTarget)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{t.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delegation Policy */}
            {playerHeyaId && (
              <div className="space-y-2">
                <Label>Delegation Policy</Label>
                <Select value={delegation} onValueChange={(v) => setDelegation(v as DelegationPolicy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELEGATION_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How your assistant manages the stable while you're away.
                </p>
              </div>
            )}

            {/* Safety Gates */}
            {playerHeyaId && (
              <div className="space-y-3">
                <Label>Interrupt On</Label>
                <div className="space-y-2">
                  {GATE_OPTIONS.map((g) => {
                    const Icon = g.icon;
                    return (
                      <div key={g.value} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {g.label}
                        </div>
                        <Switch
                          checked={activeGates.has(g.value)}
                          onCheckedChange={() => toggleGate(g.value)}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Holiday will pause if any enabled condition triggers.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGo} className="gap-2">
              <Play className="h-4 w-4" />
              Go On Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Digest Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              What Happened While You Were Away
            </DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-bold">{result.daysAdvanced}</div>
                  <div className="text-xs text-muted-foreground">Days Passed</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50 text-center">
                  <div className="text-2xl font-bold capitalize">{result.phaseOnExit.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">Current Phase</div>
                </div>
              </div>

              {/* Gate Interruption */}
              {result.gateTriggered && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Holiday Interrupted
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.gateTriggered.message}
                  </p>
                </div>
              )}

              {/* Headline */}
              <p className="text-sm font-medium">{result.digest.headline}</p>

              {/* Category Sections */}
              {result.digest.categories.length > 0 ? (
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {result.digest.categories.map((cat) => (
                      <Card key={cat.id}>
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-sm">{cat.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 pb-2">
                          <div className="space-y-1">
                            {cat.items.map((item, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                • {item}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">A quiet period — nothing notable occurred.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No result data.</p>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResult(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
