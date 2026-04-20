import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/navigation";
import {
  PageHeader,
  StatCard,
  ListCard,
  SectionHeader,
} from "@/components/layout/control-center";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Landmark, Globe, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { StatItem, ProgressItem } from "@/components/layout/control-center";
import {
  SCANDAL_LABELS,
  formatFinePenalty,
  getStatusLabel,
  spendPoliticalCapital,
  toScandalBand,
} from "@/presenters/uiDigest";
import { selectHeyasWithCriticalWelfare, selectMergerCandidates } from "@/presenters/selectors";

export default function GovernancePage() {
  const { state } = useGame();
  const world = state.world;

  const heya = useMemo(() => {
    if (!world || !world.playerHeyaId) return null;
    return world.heyas.get(world.playerHeyaId) ?? null;
  }, [world]);

  const derived = useMemo(() => {
    if (!world || !heya) return null;

    const status = heya.governanceStatus ?? "good_standing";
    const scandal = heya.scandalScore ?? 0;
    const history = heya.governanceHistory ?? [];

    const scandalBand = toScandalBand(scandal);
    const scandalTone: StatItem["tone"] =
      scandalBand === "clean"
        ? "success"
        : scandalBand === "whispers"
          ? "default"
          : scandalBand === "scrutiny"
            ? "warning"
            : "destructive";

    const welfare = heya.welfareState;
    const welfareRisk = Math.max(0, Math.min(100, Number(welfare?.welfareRisk ?? 10)));
    const compState = String(welfare?.complianceState ?? "compliant");
    const welfareLabel =
      welfareRisk <= 20
        ? "Safe"
        : welfareRisk <= 44
          ? "Cautious"
          : welfareRisk <= 69
            ? "Elevated"
            : "Critical";
    const welfareTone: StatItem["tone"] =
      welfareRisk <= 20
        ? "success"
        : welfareRisk <= 44
          ? "default"
          : welfareRisk <= 69
            ? "warning"
            : "destructive";
    const compTone: StatItem["tone"] =
      compState === "compliant" ? "success" : compState === "watch" ? "warning" : "destructive";

    const statusTone: StatItem["tone"] =
      status === "good_standing" ? "success" : status === "warning" ? "warning" : "destructive";
    const statusSub =
      status === "good_standing"
        ? "No active concerns"
        : status === "warning"
          ? "Council has noted concerns"
          : status === "probation"
            ? "Formal probation in effect"
            : "Serious sanctions applied";

    const historyRows = [...history]
      .reverse()
      .slice(0, 10)
      .map((ruling, i) => ({
        id: ruling.id || String(i),
        label: (
          <div>
            <div className="font-medium">{ruling.type.toUpperCase()}</div>
            {ruling.reason && (
              <div className="text-[10px] text-muted-foreground">{ruling.reason}</div>
            )}
          </div>
        ),
        sub: ruling.date as string | undefined,
        value: ruling.effects?.fineAmount
          ? formatFinePenalty(ruling.effects.fineAmount)
          : undefined,
        tone: "destructive" as const,
        trailing: (
          <Badge variant="outline" className="text-[10px]">
            {ruling.severity}
          </Badge>
        ),
      }));

    const criticalHeyas = selectHeyasWithCriticalWelfare(world);
    const welfareRows = criticalHeyas.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.welfareState?.complianceState ?? "compliant"} · ${h.rikishiIds?.length ?? 0} rikishi`,
      value: `Risk ${Math.round(h.welfareState?.welfareRisk ?? 0)}%`,
      tone: "warning" as const,
    }));

    const mergerCandidates = selectMergerCandidates(world);
    const mergerRows = mergerCandidates.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.rikishiIds?.length ?? 0} rikishi · ${(h.governanceStatus ?? "good_standing").replace("_", " ")}`,
      value: `¥${Math.abs(h.funds / 1_000_000).toFixed(1)}M debt`,
      tone: "destructive" as const,
    }));

    const factionList = Object.values(world.factions ?? {}).sort(
      (a, b) => b.influence - a.influence
    );
    const maxInfluence = factionList.length > 0 ? factionList[0].influence : 0;
    const factionRows = factionList.map((fac) => ({
      id: fac.id,
      label: (
        <span className="flex items-center gap-1.5 flex-wrap">
          {fac.name}
          {fac.influence === maxInfluence && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-3.5">
              Chairman
            </Badge>
          )}
          {heya.ichimon === fac.id && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-3.5 border-primary text-primary"
            >
              Yours
            </Badge>
          )}
        </span>
      ),
      sub: `Leader: ${world.oyakata.get(fac.oyakataLeaderId ?? "")?.name ?? "Unknown"}`,
      value: fac.influence,
      tone: (heya.ichimon === fac.id ? "gold" : "default") as StatItem["tone"],
    }));

    const reputationStats: StatItem[] = [
      { label: "Scandal Index", value: SCANDAL_LABELS[scandalBand], tone: scandalTone },
    ];
    const reputationProgress: ProgressItem[] = [
      { label: "Scandal Score", value: Math.min(scandal, 100), tone: scandalTone },
    ];

    const welfareStats: StatItem[] = [
      { label: "Risk Level", value: welfareLabel, tone: welfareTone },
      { label: "Status", value: compState.toUpperCase(), tone: compTone },
    ];
    const welfareProgress: ProgressItem[] = [
      { label: "Welfare Risk", value: welfareRisk, tone: welfareTone },
    ];

    const councilStats: StatItem[] = [
      { label: "Standing", value: getStatusLabel(world, status), tone: statusTone, sub: statusSub },
    ];

    const recordStats: StatItem[] = [
      { label: "Decisions on File", value: history.length },
    ];

    return {
      status,
      scandal,
      scandalBand,
      historyRows,
      welfareRows,
      mergerRows,
      factionRows,
      factionList,
      reputationStats,
      reputationProgress,
      welfareStats,
      welfareProgress,
      councilStats,
      recordStats,
    };
  }, [world, heya]);

  if (!world || !heya || !derived) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">Loading Council Records...</div>
      </AppLayout>
    );
  }

  const { status } = derived;

  return (
    <AppLayout
      pageTitle="Governance & Compliance"
      subNavTabs={ASSOCIATION_TABS}
      activeSubTab="governance"
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="Governance & Compliance"
          lede={`Official records of the Sumo Association regarding ${heya.name}.`}
          actions={
            <Badge
              variant={status === "good_standing" ? "outline" : "destructive"}
              className="text-sm px-3 py-1"
            >
              <Scale className="mr-2 h-4 w-4" />
              {getStatusLabel(world, status)}
            </Badge>
          }
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="politics" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Politics
            </TabsTrigger>
          </TabsList>

          {/* ── Overview ──────────────────────────────────────────────── */}
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
              <StatCard
                eyebrow="── JSA COUNCIL ──"
                title="Council Status"
                stats={derived.councilStats}
              />
              <StatCard
                eyebrow="── RECORD ──"
                title="Disciplinary Record"
                stats={derived.recordStats}
              />
            </div>

            <ListCard
              eyebrow="── RULINGS ──"
              title="Ruling History"
              rows={derived.historyRows}
              emptyText="No rulings on record. Keep it that way."
            />

            {derived.welfareRows.length > 0 && (
              <ListCard
                eyebrow="── WELFARE ALERTS ──"
                title="Stables Under Scrutiny"
                rows={derived.welfareRows}
              />
            )}

            {derived.mergerRows.length > 0 && (
              <ListCard
                eyebrow="── MERGER RISK ──"
                title="Stables in Crisis"
                rows={derived.mergerRows}
              />
            )}

            {world.globalCup && (
              <StatCard
                eyebrow="── GLOBAL CUP ──"
                title={`${world.globalCup.year} International Tournament`}
                stats={[
                  { label: "Phase", value: world.globalCup.phase, tone: "gold" },
                  { label: "Participants", value: world.globalCup.participants.length },
                  {
                    label: "Nations",
                    value: new Set(
                      world.globalCup.participants.map(
                        (p: { nationality: string }) => p.nationality
                      )
                    ).size,
                  },
                  ...(world.globalCup.championId
                    ? [
                        {
                          label: "Champion",
                          value:
                            world.rikishi.get(world.globalCup.championId)?.shikona ?? "Unknown",
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
            )}
          </TabsContent>

          {/* ── Politics ──────────────────────────────────────────────── */}
          <TabsContent value="politics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <SectionHeader eyebrow="── CAPITAL ──" title="Your Political Standing" />
                <StatCard
                  eyebrow=""
                  title={`${heya.ichimon ?? "Independent"} Ichimon`}
                  stats={[
                    {
                      label: "Political Capital",
                      value: heya.politicalCapital ?? 0,
                      tone: (heya.politicalCapital ?? 0) >= 100 ? "gold" : "default",
                      sub: "Spending 100 boosts Ichimon influence by 20",
                    },
                  ]}
                  actions={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (heya && (heya.politicalCapital ?? 0) >= 100) {
                          spendPoliticalCapital(world, heya.id, 100);
                        } else {
                          alert("Not enough Political Capital (need 100).");
                        }
                      }}
                      disabled={(heya.politicalCapital ?? 0) < 100}
                    >
                      Spend 100
                    </Button>
                  }
                />
              </div>

              <div className="space-y-4">
                <SectionHeader eyebrow="── RANKINGS ──" title="Ichimon Influence Rankings" />
                {derived.factionList.length > 0 ? (
                  <ListCard
                    eyebrow=""
                    title="Current Standing"
                    rows={derived.factionRows}
                    icon={Trophy}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No faction data available.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
