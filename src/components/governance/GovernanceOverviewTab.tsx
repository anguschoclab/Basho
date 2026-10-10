/**
 * GovernanceOverviewTab.tsx
 * =========================
 * Overview tab for GovernancePage: headline stat cards, unresolved
 * rulings with severity buttons, gomenfuda + YDC kihaku panels,
 * welfare/merger alert lists, and the Global Cup card.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, ListCard, SectionHeader } from "@/components/layout/control-center";
import { TabsContent } from "@/components/ui/tabs";
import { Globe } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useGameStore } from "@/store/gameStore";
import { projectGomenfuda } from "@/presenters/projections/governanceProjections";
import { getYokozunaCandidates } from "@/presenters/projections/promotionProjections";
import { getGlobalCupChampion } from "@/presenters/worldAccess";
import type { WorldState } from "@/presenters/uiDigest";
import type { Heya } from "@/engine/types/heya";
import type { GovernanceDerivedData } from "@/hooks/useGovernanceDerived.tsx";

interface Props {
  world: WorldState;
  heya: Heya;
  derived: GovernanceDerivedData;
}

export function GovernanceOverviewTab({ world, heya, derived }: Props) {
  return (
    <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          eyebrow="── REPUTATION ──"
          title="Public Perception"
          stats={derived.reputationStats}
          progress={derived.reputationProgress}
        />
        <StatCard
          eyebrow="── COMPLIANCE ──"
          title="Welfare & Safety"
          stats={derived.welfareStats}
          progress={derived.welfareProgress}
        />
        <StatCard eyebrow="── JSA COUNCIL ──" title="Council Status" stats={derived.councilStats} />
        <StatCard eyebrow="── RECORD ──" title="Disciplinary Record" stats={derived.recordStats} />
      </div>

      {derived.unresolvedRulings.length > 0 && (
        <UnresolvedRulings rulings={derived.unresolvedRulings} />
      )}

      <ListCard
        eyebrow="── RULINGS ──"
        title="Ruling History"
        rows={derived.historyRows}
        emptyText="No rulings on record. Keep it that way."
      />

      {/* Gomenfuda (Withdrawal Apology) History */}
      <GomenfudaPanel world={world} heya={heya} />

      {/* YDC Kihaku — borderline Yokozuna candidates */}
      <YdcKihakuCard world={world} />

      {derived.welfareRows.length > 0 && (
        <ListCard
          eyebrow="── WELFARE ALERTS ──"
          title="Stables Under Scrutiny"
          rows={derived.welfareRows}
        />
      )}

      {derived.mergerRows.length > 0 && (
        <ListCard eyebrow="── MERGER RISK ──" title="Stables in Crisis" rows={derived.mergerRows} />
      )}

      {derived.completedMergerRows.length > 0 && (
        <ListCard
          eyebrow="── MERGERS ──"
          title="Completed Stable Mergers"
          rows={derived.completedMergerRows}
          emptyText="No mergers on record."
        />
      )}

      {world.globalCup && <GlobalCupCard world={world} />}
    </TabsContent>
  );
}

function UnresolvedRulings({ rulings }: { rulings: GovernanceDerivedData["unresolvedRulings"] }) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  return (
    <div className="space-y-3">
      <SectionHeader eyebrow="── PENDING ──" title="Unresolved Rulings" />
      {rulings.map((r) => (
        <div key={r.id} className="rounded border border-primary/30 bg-primary/5 p-3">
          <div className="text-sm font-bold">
            {r.type.toUpperCase()} — {r.reason}
          </div>
          <div className="mt-2 flex gap-2">
            {(["lenient", "standard", "harsh"] as const).map((sev) => (
              <Button
                key={sev}
                size="sm"
                variant="outline"
                onClick={() => sendCommand({ type: "ISSUE_RULING", rulingId: r.id, severity: sev })}
              >
                {sev}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GomenfudaPanel({ world, heya }: { world: WorldState; heya: Heya }) {
  const gomen = projectGomenfuda(world, heya?.id ?? "");
  if (!gomen || gomen.recentEvents.length === 0) return null;
  return (
    <Card data-testid="gomenfuda-panel">
      <CardHeader>
        <CardTitle className="text-sm">Gomenfuda History</CardTitle>
        <CardDescription>
          Withdrawal apologies: {gomen.count}/{gomen.threshold} this year
          {gomen.hasSanctionWarning && (
            <span className="text-destructive ml-2">— sanction risk</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {gomen.recentEvents.map((e, i) => (
          <div
            key={i}
            className="text-xs p-2 rounded border border-border/50"
            data-testid={`gomenfuda-entry-${i}`}
          >
            <span className="font-medium">{e.rikishiId}</span>
            <span className="text-muted-foreground ml-2">{e.reason}</span>
            <span className="text-muted-foreground ml-2">({e.bashoName})</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function YdcKihakuCard({ world }: { world: WorldState }) {
  const candidates = getYokozunaCandidates(world);
  if (candidates.length === 0) return null;
  return (
    <Card data-testid="ydc-kihaku-card">
      <CardHeader>
        <CardTitle className="text-sm">Yokozuna Deliberation — Fighting Spirit</CardTitle>
        <CardDescription>Kihaku scores for borderline Yokozuna candidates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {candidates.map((c) => (
          <div
            key={c.rikishi.id}
            className="flex items-center justify-between text-xs p-2 rounded border border-border/50"
            data-testid={`ydc-candidate-${c.rikishi.id}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{c.rikishi.shikona}</span>
              <Badge
                variant={c.supportLevel === "strong" ? "default" : "outline"}
                className="text-[10px]"
              >
                {c.supportLevel}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">
                Yusho: {c.recentYushos} · Jun-Yusho: {c.recentJunYushos}
              </span>
              {c.rikishi.kihakuIsenScore !== undefined && c.rikishi.kihakuIsenScore > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  Kihaku: {c.rikishi.kihakuIsenScore}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GlobalCupCard({ world }: { world: WorldState }) {
  if (!world.globalCup) return null;
  return (
    <StatCard
      eyebrow="── GLOBAL CUP ──"
      title={`${world.globalCup.year} International Tournament`}
      stats={[
        { label: "Phase", value: world.globalCup.phase, tone: "gold" },
        { label: "Participants", value: world.globalCup.participants.length },
        {
          label: "Nations",
          value: new Set(
            world.globalCup.participants.map((p: { nationality: string }) => p.nationality)
          ).size,
        },
        ...(world.globalCup.championId
          ? [
              {
                label: "Champion",
                value: getGlobalCupChampion(world)?.shikona ?? "Unknown",
                tone: "gold" as const,
              },
            ]
          : []),
      ]}
      cols={4}
      actions={
        <Link to="/global-cup">
          <Button size="sm" variant="outline">
            <Globe className="h-4 w-4 mr-1.5" />
            View
          </Button>
        </Link>
      }
    />
  );
}
