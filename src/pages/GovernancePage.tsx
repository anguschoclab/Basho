import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { PageHeader, StatCard, ListCard, SectionHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Landmark, Globe, Trophy, ShieldAlert, Coins, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { StatItem, ProgressItem } from "@/components/layout/control-center";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import { SCANDAL_LABELS, formatFinePenalty, getStatusLabel } from "@/presenters/uiDigest";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { projectGovernanceDerived } from "@/presenters/projections/governanceProjections";
import { selectClosedHeyas, selectYokozunaVacancyStreak } from "@/presenters/selectors";
import { getOyakata, getGlobalCupChampion } from "@/presenters/worldAccess";
import type { Faction } from "@/engine/types/economy";

const FACTION_SORT_OPTIONS: SortOption[] = [
  { key: "influence", label: "Influence" },
  { key: "name", label: "Name" },
  { key: "rikishiCount", label: "Rikishi Count" },
];

export default function GovernancePage() {
  const { state, issueRuling, spendPoliticalCapital } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);
  const world = state.world;

  const [factionSortKey, setFactionSortKey] = useState<string>("influence");
  const [factionSortOrder, setFactionSortOrder] = useState<SortDirection>("desc");

  const heya = useMemo(() => {
    if (!world || !world.playerHeyaId) return null;
    return getPlayerHeya(world) ?? null;
  }, [world]);

  const closedHeyas = useMemo(
    () => (world ? (world.closedHeyas ? selectClosedHeyas(world) : []) : []),
    [world]
  );
  const yokozunaVacancyStreak = useMemo(
    () => (world ? (world.yokozunaVacancyStreak ?? selectYokozunaVacancyStreak(world)) : 0),
    [world]
  );

  const derived = useMemo(() => {
    if (!world || !heya) return null;

    const gov = projectGovernanceDerived(world, heya);

    const history = heya.governanceHistory ?? [];
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

    const welfareRows = gov.criticalHeyas.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.welfareState?.complianceState ?? "compliant"} · ${h.rikishiIds?.length ?? 0} rikishi`,
      value: `Risk ${Math.round(h.welfareState?.welfareRisk ?? 0)}%`,
      tone: "warning" as const,
    }));

    const mergerRows = gov.mergerCandidates.map((h) => ({
      id: h.id,
      label: h.name,
      sub: `${h.rikishiIds?.length ?? 0} rikishi · ${(h.governanceStatus ?? "good_standing").replace("_", " ")}`,
      value: `¥${Math.abs(h.funds / 1_000_000).toFixed(1)}M debt`,
      tone: "destructive" as const,
    }));

    const completedMergerRows = gov.completedMergerEvents.map((e) => ({
      id: e.id,
      label: `${e.data?.heyaname ?? "Unknown"} → ${e.data?.heya ?? "Unknown"}`,
      sub: `Year ${e.year}, Week ${e.week} · ${String(e.data?.reason ?? e.data?.incident ?? "merger")}`,
      tone: "default" as const,
    }));

    const maxInfluence = gov.factionList.length > 0 ? gov.factionList[0].influence : 0;
    const factionRows = gov.factionList.map((fac) => ({
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
      sub: `Leader: ${getOyakata(world, fac.oyakataLeaderId ?? "")?.name ?? "Unknown"}`,
      value: fac.influence,
      tone: (heya.ichimon === fac.id ? "gold" : "default") as StatItem["tone"],
    }));

    const reputationStats: StatItem[] = [
      { label: "Scandal Index", value: SCANDAL_LABELS[gov.scandalBand], tone: gov.scandalTone },
    ];
    const reputationProgress: ProgressItem[] = [
      { label: "Scandal Score", value: Math.min(gov.scandal, 100), tone: gov.scandalTone },
    ];

    const welfareStats: StatItem[] = [
      { label: "Risk Level", value: gov.welfareLabel, tone: gov.welfareTone },
      { label: "Status", value: gov.compState.toUpperCase(), tone: gov.compTone },
    ];
    const welfareProgress: ProgressItem[] = [
      { label: "Welfare Risk", value: gov.welfareRisk, tone: gov.welfareTone },
    ];

    const councilStats: StatItem[] = [
      {
        label: "Standing",
        value: getStatusLabel(world, gov.status),
        tone: gov.statusTone,
        sub: gov.statusSub,
      },
    ];

    const recordStats: StatItem[] = [{ label: "Decisions on File", value: history.length }];

    return {
      status: gov.status,
      scandal: gov.scandal,
      scandalBand: gov.scandalBand,
      historyRows,
      unresolvedRulings: gov.unresolvedRulings,
      welfareRows,
      mergerRows,
      completedMergerRows,
      factionRows,
      factionList: gov.factionList,
      reputationStats,
      reputationProgress,
      welfareStats,
      welfareProgress,
      councilStats,
      recordStats,
      pendingRulings: gov.pendingRulings,
    };
  }, [world, heya]);

  const sortedFactionRows = useMemo(() => {
    if (!derived || !world || derived.factionList.length === 0) return [];
    const accessor: Record<string, (fac: Faction) => string | number | undefined> = {
      influence: (f) => f.influence,
      name: (f) => f.name,
      rikishiCount: () => 0,
    };
    const fn = accessor[factionSortKey];
    if (!fn) return derived.factionRows;
    const sorted = [...derived.factionList].sort((a, b) => compareBy(a, b, fn, factionSortOrder));
    const maxInfluence = sorted.length > 0 ? sorted[0].influence : 0;
    return sorted.map((fac) => ({
      id: fac.id,
      label: (
        <span className="flex items-center gap-1.5 flex-wrap">
          {fac.name}
          {fac.influence === maxInfluence && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-3.5">
              Chairman
            </Badge>
          )}
          {heya?.ichimon === fac.id && (
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-3.5 border-primary text-primary"
            >
              Yours
            </Badge>
          )}
        </span>
      ),
      sub: `Leader: ${getOyakata(world, fac.oyakataLeaderId ?? "")?.name ?? "Unknown"}`,
      value: fac.influence,
      tone: (heya?.ichimon === fac.id ? "gold" : "default") as StatItem["tone"],
    }));
  }, [derived, world, factionSortKey, factionSortOrder, heya]);

  const resolvedRulingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const g of world?.governanceLog ?? []) {
      if (g.playerSeverity !== undefined) ids.add(g.id);
    }
    return ids;
  }, [world?.governanceLog]);

  if (!world || !heya || !derived) {
    return (
      <AppLayout
        pageTitle="Governance & Compliance"
        subNavTabs={ASSOCIATION_TABS}
        activeSubTab="governance"
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
          <div className="text-4xl animate-pulse font-display">⋯</div>
          <p className="text-sm font-display italic uppercase tracking-widest">Loading…</p>
        </div>
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

        {(closedHeyas.length > 0 || yokozunaVacancyStreak > 0) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {closedHeyas.length > 0 && <span>{closedHeyas.length} stable(s) closed</span>}
            {yokozunaVacancyStreak > 0 && (
              <span>Yokozuna vacancy: {yokozunaVacancyStreak} basho</span>
            )}
          </div>
        )}

        <Tabs
          defaultValue={derived.pendingRulings.length > 0 ? "rulings" : "overview"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 md:w-[520px] mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rulings" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Rulings
              {derived.pendingRulings.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[9px]">
                  {derived.pendingRulings.length}
                </Badge>
              )}
            </TabsTrigger>
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

            {derived.unresolvedRulings.length > 0 && (
              <div className="space-y-3">
                <SectionHeader eyebrow="── PENDING ──" title="Unresolved Rulings" />
                {derived.unresolvedRulings.map((r) => (
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
                          onClick={() =>
                            sendCommand({ type: "ISSUE_RULING", rulingId: r.id, severity: sev })
                          }
                        >
                          {sev}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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

            {derived.completedMergerRows.length > 0 && (
              <ListCard
                eyebrow="── MERGERS ──"
                title="Completed Stable Mergers"
                rows={derived.completedMergerRows}
                emptyText="No mergers on record."
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
            )}
          </TabsContent>

          {/* ── Rulings ───────────────────────────────────────────────── */}
          <TabsContent value="rulings" className="space-y-6">
            {derived.pendingRulings.length === 0 ? (
              <Card className="paper">
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No rulings pending your decision. Keep a clean house.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {derived.pendingRulings.map((ruling) => (
                  <Card key={ruling.id} className="paper border-warning/40 bg-warning/5">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                          <CardTitle className="text-sm font-bold uppercase tracking-wide">
                            {ruling.type} — {ruling.severity} severity
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ruling.date}
                        </Badge>
                      </div>
                      <CardDescription className="ml-6 text-xs">{ruling.reason}</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 ml-6 space-y-3">
                      {ruling.effects.fineAmount && (
                        <p className="text-xs text-muted-foreground">
                          Proposed fine:{" "}
                          <span className="font-mono font-bold text-destructive">
                            {formatFinePenalty(ruling.effects.fineAmount)}
                          </span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-success/40 text-success hover:bg-success/10 text-xs h-7"
                          onClick={() => {
                            issueRuling(ruling.id, "lenient");
                            toast.success("Lenient ruling issued — costs 10 political capital.");
                          }}
                        >
                          Lenient (−10 cap)
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            issueRuling(ruling.id, "standard");
                            toast.info("Standard ruling issued.");
                          }}
                        >
                          Standard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs h-7"
                          onClick={() => {
                            issueRuling(ruling.id, "harsh");
                            toast.success("Harsh ruling issued — earns 5 political capital.");
                          }}
                        >
                          Harsh (+5 cap)
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 leading-tight">
                        Lenient reduces scandal impact but costs capital. Harsh maximises the
                        penalty and earns capital. Standard applies full effects as written.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <ListCard
              eyebrow="── RECORD ──"
              title="Resolved Rulings"
              rows={derived.historyRows.filter((r) => resolvedRulingIds.has(r.id))}
              emptyText="No resolved rulings yet."
            />
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
                        if (heya && (heya.politicalCapital ?? 0) >= 100 && world) {
                          spendPoliticalCapital(heya.id, 100);
                        } else {
                          toast.error("Not enough Political Capital (need 100).");
                        }
                      }}
                      disabled={(heya.politicalCapital ?? 0) < 100}
                      tooltip={
                        (heya.politicalCapital ?? 0) < 100
                          ? "Not enough Political Capital (need 100)"
                          : undefined
                      }
                    >
                      Spend 100
                    </Button>
                  }
                />
              </div>

              <div className="space-y-4">
                <SectionHeader eyebrow="── FAVORS ──" title="JSA Political Favors" />
                <div className="grid gap-3">
                  {[
                    {
                      id: "matchmaking_avoid",
                      label: "Matchmaking Influence",
                      description: "Avoid a specific rival for one day.",
                      cost: 15,
                      icon: ShieldAlert,
                    },
                    {
                      id: "advance_payout",
                      label: "Emergency Stipend",
                      description: "Immediate ¥5,000,000 cash infusion.",
                      cost: 25,
                      icon: Coins,
                    },
                    {
                      id: "governance_pardon",
                      label: "Council Clemency",
                      description: "Wipe 10 points from your Scandal Score.",
                      cost: 40,
                      icon: Scale,
                    },
                  ].map((favor) => (
                    <Card
                      key={favor.id}
                      className="relative overflow-hidden group border-border/40 bg-card/30 backdrop-blur-xs"
                    >
                      <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted/40 rounded shadow-inner">
                            <favor.icon className="h-4.5 w-4.5 text-primary/80" />
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-foreground/90">
                              {favor.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground/80 leading-tight">
                              {favor.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-[11px] font-mono font-bold text-primary">
                            {favor.cost} CAP
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-[9px] uppercase font-black tracking-tighter border-primary/20 hover:border-primary/50 transition-all"
                            disabled={(heya.politicalCapital ?? 0) < favor.cost}
                            tooltip={
                              (heya.politicalCapital ?? 0) < favor.cost
                                ? `Not enough Political Capital (need ${favor.cost})`
                                : undefined
                            }
                            onClick={() => {
                              sendCommand({
                                type: "REQUEST_POLITICAL_FAVOR",
                                heyaId: heya.id,
                                favorId: favor.id,
                              });
                            }}
                          >
                            Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <SectionHeader eyebrow="── RANKINGS ──" title="Ichimon Influence Rankings" />
                  {derived.factionList.length > 0 && (
                    <SortMenu
                      options={FACTION_SORT_OPTIONS}
                      storageKey="basho_sort_governance_faction"
                      defaultSortKey="influence"
                      defaultSortOrder="desc"
                      onSortChange={(key, order) => {
                        setFactionSortKey(key);
                        setFactionSortOrder(order);
                      }}
                    />
                  )}
                </div>
                {derived.factionList.length > 0 ? (
                  <ListCard
                    eyebrow=""
                    title="Current Standing"
                    rows={sortedFactionRows}
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
