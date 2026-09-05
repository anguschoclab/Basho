/**
 * HolidayDialog — player-facing dialog for going on holiday.
 *
 * Lets the player choose a target (how far to sim), safety gates,
 * and delegation policy. Dispatches the GO_ON_HOLIDAY worker command.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plane, ShieldCheck } from "lucide-react";
import type {
  HolidayTarget,
  SafetyGate,
  DelegationPolicy,
} from "@/engine/holiday";

const TARGETS: { value: HolidayTarget; label: string }[] = [
  { value: "nextDay", label: "Next Day" },
  { value: "nextWeek", label: "Next Week" },
  { value: "nextBashoDay1", label: "Next Basho Day 1" },
  { value: "endOfBasho", label: "End of Basho" },
  { value: "postBasho", label: "Post Basho" },
  { value: "nextMonth", label: "Next Month" },
];

const GATES: { value: SafetyGate; label: string }[] = [
  { value: "topRikishiInjury", label: "Top Rikishi Injury" },
  { value: "insolvencyWarning", label: "Insolvency Warning" },
  { value: "scandalSeverity", label: "Scandal Severity" },
  { value: "sponsorChurn", label: "Sponsor Churn" },
  { value: "promotionRun", label: "Promotion Run" },
  { value: "loanDefault", label: "Loan Default" },
  { value: "rosterOverForeignLimit", label: "Foreign Roster Limit" },
];

const POLICIES: { value: DelegationPolicy; label: string }[] = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
  { value: "roleplay", label: "Roleplay" },
];

export function HolidayDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (config: {
    target: HolidayTarget;
    gates: SafetyGate[];
    delegationPolicy: DelegationPolicy;
  }) => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState<HolidayTarget>("nextWeek");
  const [gates, setGates] = useState<SafetyGate[]>([
    "topRikishiInjury",
    "insolvencyWarning",
    "scandalSeverity",
  ]);
  const [policy, setPolicy] = useState<DelegationPolicy>("balanced");

  const toggleGate = (gate: SafetyGate) => {
    setGates((prev) =>
      prev.includes(gate) ? prev.filter((g) => g !== gate) : [...prev, gate]
    );
  };

  return (
    <Card className="border-primary/30" data-testid="holiday-dialog">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Go on Holiday</span>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Target
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={target === t.value ? "default" : "outline"}
                onClick={() => setTarget(t.value)}
                data-testid={`holiday-target-${t.value}`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Safety Gates
          </Label>
          <div className="flex flex-wrap gap-2">
            {GATES.map((g) => (
              <Badge
                key={g.value}
                variant={gates.includes(g.value) ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => toggleGate(g.value)}
                data-testid={`holiday-gate-${g.value}`}
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                {g.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Delegation Policy
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {POLICIES.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={policy === p.value ? "default" : "outline"}
                onClick={() => setPolicy(p.value)}
                data-testid={`holiday-policy-${p.value}`}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border/30">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onConfirm({ target, gates, delegationPolicy: policy })}
            data-testid="holiday-confirm"
          >
            <Plane className="h-3 w-3 mr-1" />
            Go on Holiday
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            data-testid="holiday-cancel"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
